import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, trim: true, default: "" },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio"],
      default: "text",
    },
    fileUrl:  { type: String, default: "" },
    fileName: { type: String, default: "" },

    // Reply threading
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Seen / delivered tracking
    seenBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Emoji reactions
    reactions: [{
      user:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: String,
    }],

    // ── New metadata fields ───────────────────────────────────────────────

    // "Delete for Everyone" — hard-deleted for all viewers
    isDeleted: { type: Boolean, default: false },

    // "Delete for Me" — array of userIds who have locally deleted this message
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Editing
    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date, default: null },
    originalContent: { type: String, default: "" }, // keep original for reference

    // Pinning
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for efficient pagination per chat
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ chat: 1, isPinned: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
