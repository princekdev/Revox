import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupPic:   { type: String, default: "" },
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    unreadCount: { type: Map, of: Number, default: {} },

    // Pinned message per chat (one at a time)
    pinnedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Custom nickname for 1-1 chats, keyed by userId
    // e.g. { "userId1": "My nickname for this person" }
    nicknames: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

chatSchema.index({ users: 1 });
chatSchema.index({ updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
