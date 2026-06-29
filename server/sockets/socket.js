import { socketAuth } from "../middleware/auth.middleware.js";
import User from "../models/User.model.js";
import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";

// Standard message population
const populateMsg = (query) =>
  query
    .populate("sender", "name profilePic email")
    .populate({
      path: "replyTo",
      select: "content messageType sender fileUrl isDeleted",
      populate: { path: "sender", select: "name" },
    });

export const initSocket = (io) => {
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const user = socket.user;

    // ── setup ─────────────────────────────────────────────────────────────
    socket.on("setup", async () => {
      socket.join(user._id.toString());
      await User.findByIdAndUpdate(user._id, { isOnline: true, socketId: socket.id });
      socket.broadcast.emit("user_online", { userId: user._id, isOnline: true });
      socket.emit("connected");
    });

    // ── rooms ─────────────────────────────────────────────────────────────
    socket.on("join_chat",  (chatId) => socket.join(chatId));
    socket.on("leave_chat", (chatId) => socket.leave(chatId));

    // ── send_message ──────────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      try {
        const {
          chatId, content = "", messageType = "text",
          fileUrl = "", fileName = "", tempId, replyTo = null,
        } = data;
        if (!chatId || (!content && !fileUrl)) return;

        let message = await Message.create({
          sender: user._id, content, chat: chatId,
          messageType, fileUrl, fileName,
          replyTo: replyTo || null,
          seenBy: [user._id], deliveredTo: [user._id],
        });

        message = await populateMsg(Message.findById(message._id));
        const msgObj = { ...message.toObject(), tempId: tempId || null };

        // Update chat
        const chat = await Chat.findById(chatId).populate("users");
        if (chat) {
          chat.latestMessage = message._id;
          for (const u of chat.users) {
            if (u._id.toString() !== user._id.toString()) {
              chat.unreadCount.set(u._id.toString(),
                (chat.unreadCount.get(u._id.toString()) || 0) + 1
              );
            }
          }
          await chat.save();
        }

        socket.emit("message_sent", { message: msgObj });
        socket.to(chatId).emit("message_received", { message: msgObj });

        // Notify users not in the room
        if (chat) {
          const roomSockets = await io.in(chatId).fetchSockets();
          const inRoom = new Set(roomSockets.map((s) => s.user?._id?.toString()));
          for (const u of chat.users) {
            const uid = u._id.toString();
            if (uid !== user._id.toString() && !inRoom.has(uid)) {
              io.to(uid).emit("new_message_notification", { message: msgObj, chat });
            }
          }
        }
      } catch (err) {
        console.error("send_message:", err);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // ── edit_message ──────────────────────────────────────────────────────
    socket.on("edit_message", async ({ messageId, content, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        if (message.sender.toString() !== user._id.toString()) return;
        if (message.isDeleted || message.messageType !== "text") return;

        if (!message.isEdited) message.originalContent = message.content;
        message.content  = content.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        const populated = await populateMsg(Message.findById(message._id));
        io.to(chatId).emit("message_edited", { message: populated.toObject() });
      } catch (err) {
        console.error("edit_message:", err);
      }
    });

    // ── delete_message ────────────────────────────────────────────────────
    socket.on("delete_message", async ({ messageId, chatId, scope }) => {
      // scope: "everyone" | "me"
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        if (scope === "everyone") {
          if (message.sender.toString() !== user._id.toString()) return;
          message.isDeleted = true;
          message.content   = "This message was deleted";
          message.fileUrl   = "";
          message.fileName  = "";
          await message.save();
          // Broadcast to room so all clients remove / grey out the bubble
          io.to(chatId).emit("message_deleted", {
            messageId, chatId, scope: "everyone",
          });
        } else {
          // "me" — just add this user to deletedFor; only tell the sender's socket
          if (!message.deletedFor.map(String).includes(user._id.toString())) {
            message.deletedFor.push(user._id);
          }
          await message.save();
          // Only the requesting socket needs to know — don't broadcast
          socket.emit("message_deleted", {
            messageId, chatId, scope: "me",
          });
        }
      } catch (err) {
        console.error("delete_message:", err);
      }
    });

    // ── pin_message ───────────────────────────────────────────────────────
    socket.on("pin_message", async ({ messageId, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const isPinning = !message.isPinned;
        await Message.updateMany({ chat: chatId, isPinned: true }, { isPinned: false });

        if (isPinning) {
          message.isPinned = true;
          await message.save();
          await Chat.findByIdAndUpdate(chatId, { pinnedMessage: message._id });
        } else {
          message.isPinned = false;
          await message.save();
          await Chat.findByIdAndUpdate(chatId, { pinnedMessage: null });
        }

        const populated = await populateMsg(Message.findById(message._id));
        io.to(chatId).emit("message_pinned", {
          message: populated.toObject(),
          isPinned: isPinning,
          chatId,
        });
      } catch (err) {
        console.error("pin_message:", err);
      }
    });

    // ── typing ────────────────────────────────────────────────────────────
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("typing", { chatId, user: { _id: user._id, name: user.name } });
    });
    socket.on("stop_typing", ({ chatId }) => {
      socket.to(chatId).emit("stop_typing", { chatId, userId: user._id });
    });

    // ── message delivered ─────────────────────────────────────────────────
    socket.on("message_delivered", async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: user._id } });
        const message = await Message.findById(messageId);
        if (message) {
          io.to(message.sender.toString()).emit("message_status_update", {
            messageId, deliveredTo: message.deliveredTo,
          });
        }
      } catch (err) { console.error("message_delivered:", err); }
    });

    // ── mark_seen ─────────────────────────────────────────────────────────
    socket.on("mark_seen", async ({ chatId }) => {
      try {
        const unseen = await Message.countDocuments({
          chat: chatId, seenBy: { $ne: user._id },
        });
        if (unseen > 0) {
          await Message.updateMany(
            { chat: chatId, seenBy: { $ne: user._id } },
            { $addToSet: { seenBy: user._id } }
          );
          await Chat.findByIdAndUpdate(chatId, { [`unreadCount.${user._id}`]: 0 });
          socket.to(chatId).emit("messages_seen", {
            chatId, seenBy: user._id, seenByName: user.name,
          });
        }
        socket.emit("unread_reset", { chatId, userId: user._id });
      } catch (err) { console.error("mark_seen:", err); }
    });

    // ── react ─────────────────────────────────────────────────────────────
    socket.on("react_to_message", async ({ messageId, emoji, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        message.reactions = message.reactions.filter(
          (r) => r.user.toString() !== user._id.toString()
        );
        if (emoji) message.reactions.push({ user: user._id, emoji });
        await message.save();
        io.to(chatId).emit("reaction_updated", { messageId, reactions: message.reactions });
      } catch (err) { console.error("react_to_message:", err); }
    });

    // ── WebRTC ────────────────────────────────────────────────────────────
    socket.on("call_user", ({ chatId, offer, callType }) => {
      socket.to(chatId).emit("incoming_call", {
        from: { _id: user._id, name: user.name, profilePic: user.profilePic },
        offer, callType, chatId,
      });
    });
    socket.on("call_answer",    ({ chatId, answer })    => socket.to(chatId).emit("call_answered", { answer }));
    socket.on("ice_candidate",  ({ chatId, candidate }) => socket.to(chatId).emit("ice_candidate", { candidate }));
    socket.on("call_rejected",  ({ chatId })            => socket.to(chatId).emit("call_rejected",  { by: { _id: user._id, name: user.name } }));

    socket.on("call_ended", async ({ chatId, callType, duration }) => {
      socket.to(chatId).emit("call_ended", { by: { _id: user._id, name: user.name } });
      try {
        const secs = duration || 0;
        const mins = Math.floor(secs / 60);
        const dur  = secs > 0 ? ` (${mins > 0 ? `${mins}m ` : ""}${secs % 60}s)` : "";
        const icon = callType === "video" ? "📹" : "📞";
        const content = `${icon} ${callType === "video" ? "Video" : "Voice"} call ended${dur}`;
        let msg = await Message.create({ sender: user._id, content, chat: chatId, messageType: "text", seenBy: [], deliveredTo: [] });
        msg = await msg.populate("sender", "name profilePic");
        await Chat.findByIdAndUpdate(chatId, { latestMessage: msg._id });
        io.to(chatId).emit("missed_call_message", { message: msg.toObject(), chatId });
      } catch (err) { console.error("call_ended msg:", err); }
    });

    socket.on("call_missed", async ({ chatId, callType, callerName }) => {
      try {
        const icon = callType === "video" ? "📹" : "📞";
        const content = `${icon} Missed ${callType === "video" ? "video" : "voice"} call from ${callerName}`;
        let msg = await Message.create({ sender: user._id, content, chat: chatId, messageType: "text", seenBy: [], deliveredTo: [] });
        msg = await msg.populate("sender", "name profilePic");
        await Chat.findByIdAndUpdate(chatId, { latestMessage: msg._id });
        io.to(chatId).emit("missed_call_message", { message: msg.toObject(), chatId });
      } catch (err) { console.error("call_missed:", err); }
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      try {
        await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date(), socketId: null });
        socket.broadcast.emit("user_online", { userId: user._id, isOnline: false, lastSeen: new Date() });
      } catch (err) { console.error("disconnect:", err); }
    });
  });
};
