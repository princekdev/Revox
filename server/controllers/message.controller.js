import Message from "../models/Message.model.js";
import Chat from "../models/Chat.model.js";

const MESSAGES_PER_PAGE = 30;
 
// Helper: standard population for a message
const populateMsg = (query) =>
  query
    .populate("sender", "name profilePic")
    .populate({
      path: "replyTo",
      select: "content messageType sender fileUrl isDeleted",
      populate: { path: "sender", select: "name" },
    });

// GET /api/messages/:chatId  — paginated, hides "deletedFor" entries for the caller
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * MESSAGES_PER_PAGE;
  const userId = req.user._id;

  try {
    // Exclude messages that are globally deleted OR deleted-for-me by this user
    const filter = {
      chat: chatId,
      isDeleted: false,
      deletedFor: { $ne: userId },
    };

    const [messages, total] = await Promise.all([
      populateMsg(
        Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(MESSAGES_PER_PAGE)
      ),
      Message.countDocuments(filter),
    ]);

    res.json({
      messages: messages.reverse(),
      currentPage: page,
      totalPages: Math.ceil(total / MESSAGES_PER_PAGE),
      hasMore: skip + MESSAGES_PER_PAGE < total,
    });
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/messages  — REST fallback (real-time path is via socket)
export const sendMessage = async (req, res) => {
  const { content, chatId, messageType = "text", fileUrl, fileName, replyTo } = req.body;
  if (!chatId) return res.status(400).json({ error: "chatId is required" });
  try {
    let message = await Message.create({
      sender: req.user._id,
      content: content || "",
      chat: chatId,
      messageType,
      fileUrl:  fileUrl  || "",
      fileName: fileName || "",
      replyTo:  replyTo  || null,
      deliveredTo: [req.user._id],
      seenBy:      [req.user._id],
    });
    message = await populateMsg(Message.findById(message._id));
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/messages/seen
export const markSeen = async (req, res) => {
  const { chatId } = req.body;
  try {
    await Message.updateMany(
      { chat: chatId, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );
    await Chat.findByIdAndUpdate(chatId, { [`unreadCount.${req.user._id}`]: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/messages/:id?scope=me|everyone
export const deleteMessage = async (req, res) => {
  const scope = req.query.scope || "everyone"; // "me" | "everyone"
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const isOwner = message.sender.toString() === req.user._id.toString();

    if (scope === "everyone") {
      // Only sender can delete for everyone
      if (!isOwner) return res.status(403).json({ error: "Only the sender can delete for everyone" });
      message.isDeleted = true;
      message.content = "This message was deleted";
      message.fileUrl  = "";
      message.fileName = "";
    } else {
      // "Delete for me" — anyone can hide any message for themselves
      if (!message.deletedFor.map(String).includes(req.user._id.toString())) {
        message.deletedFor.push(req.user._id);
      }
    }

    await message.save();
    res.json({ message: message.toObject(), scope });
  } catch (err) {
    console.error("deleteMessage:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/messages/:id/edit
export const editMessage = async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only the sender can edit this message" });
    if (message.isDeleted)
      return res.status(400).json({ error: "Cannot edit a deleted message" });
    if (message.messageType !== "text")
      return res.status(400).json({ error: "Only text messages can be edited" });

    // Store original on first edit
    if (!message.isEdited) message.originalContent = message.content;

    message.content   = content.trim();
    message.isEdited  = true;
    message.editedAt  = new Date();
    await message.save();

    const populated = await populateMsg(Message.findById(message._id));
    res.json({ message: populated });
  } catch (err) {
    console.error("editMessage:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/messages/:id/react
export const reactToMessage = async (req, res) => {
  const { emoji } = req.body;
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );
    if (emoji) message.reactions.push({ user: req.user._id, emoji });
    await message.save();
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/messages/:id/pin  — pin / unpin a message in its chat
export const pinMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const isPinning = !message.isPinned;

    // Unpin any currently pinned message in this chat
    await Message.updateMany({ chat: message.chat, isPinned: true }, { isPinned: false });

    if (isPinning) {
      message.isPinned = true;
      await message.save();
      await Chat.findByIdAndUpdate(message.chat, { pinnedMessage: message._id });
    } else {
      message.isPinned = false;
      await message.save();
      await Chat.findByIdAndUpdate(message.chat, { pinnedMessage: null });
    }

    const populated = await populateMsg(Message.findById(message._id));
    res.json({ message: populated, isPinned: isPinning });
  } catch (err) {
    console.error("pinMessage:", err);
    res.status(500).json({ error: "Server error" });
  }
};
