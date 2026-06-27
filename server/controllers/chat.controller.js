import Chat from "../models/Chat.model.js";
import Message from "../models/Message.model.js";

const populateChat = (query) =>
  query
    .populate("users", "name email profilePic isOnline lastSeen")
    .populate("groupAdmin", "name profilePic")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "name profilePic" },
    })
    .populate({
      path: "pinnedMessage",
      select: "content messageType sender fileUrl isDeleted isEdited",
      populate: { path: "sender", select: "name profilePic" },
    });

// POST /api/chats — access or create 1-1 chat
export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    let chat = await populateChat(
      Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
          { users: { $size: 2 } },
        ],
      })
    );

    if (!chat) {
      const created = await Chat.create({ users: [req.user._id, userId] });
      chat = await populateChat(Chat.findById(created._id));
    }
    res.json({ chat });
  } catch (err) {
    console.error("accessChat:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/chats
export const getChats = async (req, res) => {
  try {
    const chats = await populateChat(
      Chat.find({ users: req.user._id }).sort({ updatedAt: -1 })
    );
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/chats/group
export const createGroupChat = async (req, res) => {
  const { users, chatName } = req.body;
  if (!users || users.length < 2)
    return res.status(400).json({ error: "At least 2 other users required" });
  try {
    const allUsers = [...new Set([...users, req.user._id.toString()])];
    const created = await Chat.create({
      chatName, isGroupChat: true,
      users: allUsers, groupAdmin: req.user._id,
    });
    const chat = await populateChat(Chat.findById(created._id));
    res.status(201).json({ chat });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/chats/group/:id — rename group (admin only)
export const renameGroup = async (req, res) => {
  const { chatName } = req.body;
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.isGroupChat && chat.groupAdmin?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only admin can rename the group" });

    const updated = await populateChat(
      Chat.findByIdAndUpdate(req.params.id, { chatName }, { new: true })
    );
    res.json({ chat: updated });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/chats/:id/nickname — set custom nickname for a 1-1 chat
export const setNickname = async (req, res) => {
  const { nickname } = req.body; // nickname for the OTHER person as seen by req.user
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!chat.users.map(String).includes(req.user._id.toString()))
      return res.status(403).json({ error: "Not a member of this chat" });

    chat.nicknames.set(req.user._id.toString(), nickname || "");
    await chat.save();
    const updated = await populateChat(Chat.findById(chat._id));
    res.json({ chat: updated });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/chats/group/:id/add
export const addToGroup = async (req, res) => {
  const { userId } = req.body;
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.groupAdmin?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only admin can add members" });

    const updated = await populateChat(
      Chat.findByIdAndUpdate(req.params.id, { $addToSet: { users: userId } }, { new: true })
    );
    res.json({ chat: updated });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/chats/group/:id/remove
export const removeFromGroup = async (req, res) => {
  const { userId } = req.body;
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.groupAdmin?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only admin can remove members" });

    const updated = await populateChat(
      Chat.findByIdAndUpdate(req.params.id, { $pull: { users: userId } }, { new: true })
    );
    res.json({ chat: updated });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/chats/:id
export const deleteChatForUser = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!chat.users.map(String).includes(req.user._id.toString()))
      return res.status(403).json({ error: "Not authorized" });

    if (chat.isGroupChat) {
      if (chat.groupAdmin?.toString() === req.user._id.toString()) {
        await Message.deleteMany({ chat: chat._id });
        await Chat.findByIdAndDelete(chat._id);
      } else {
        await Chat.findByIdAndUpdate(chat._id, { $pull: { users: req.user._id } });
      }
    } else {
      await Message.deleteMany({ chat: chat._id });
      await Chat.findByIdAndDelete(chat._id);
    }
    res.json({ success: true, chatId: req.params.id });
  } catch (err) {
    console.error("deleteChatForUser:", err);
    res.status(500).json({ error: "Server error" });
  }
};
