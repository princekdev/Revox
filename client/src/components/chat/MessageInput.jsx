import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { optimisticAddMessage, updateEditedMessage } from "../../redux/slices/messageSlice.js";
import { updateLatestMessage } from "../../redux/slices/chatSlice.js";
import { getSocket } from "../../utils/socket.js";
import api from "../../utils/api.js";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";

const TYPING_DEBOUNCE = 2000;

export default function MessageInput({ replyTo, onClearReply, editingMessage, onClearEdit }) {
  const dispatch = useDispatch();
  const { activeChat } = useSelector((s) => s.chat);
  const { user }       = useSelector((s) => s.auth);

  const [text, setText]               = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setProgress] = useState(0);

  const inputRef        = useRef(null);
  const typingTimeout   = useRef(null);
  const isTypingRef     = useRef(false);
  const fileInputRef    = useRef(null);

  // Populate input when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || "");
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Focus on reply
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  // Reset on chat switch
  useEffect(() => {
    setText("");
    onClearReply?.();
    onClearEdit?.();
    return () => {
      clearTimeout(typingTimeout.current);
      const socket = getSocket();
      if (socket && activeChat?._id && isTypingRef.current) {
        socket.emit("stop_typing", { chatId: activeChat._id });
      }
      isTypingRef.current = false;
    };
  }, [activeChat?._id]); // eslint-disable-line

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeChat?._id) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { chatId: activeChat._id });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stop_typing", { chatId: activeChat._id });
    }, TYPING_DEBOUNCE);
  }, [activeChat?._id]);

  // ── Submit: either send new message OR save edit ───────────────────────
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;

    if (editingMessage) {
      // ── Edit mode ──
      const socket = getSocket();
      socket?.emit("edit_message", {
        messageId: editingMessage._id,
        content: text.trim(),
        chatId: activeChat._id,
      });
      // Optimistic local update
      dispatch(updateEditedMessage({
        ...editingMessage,
        content:   text.trim(),
        isEdited:  true,
        editedAt:  new Date().toISOString(),
      }));
      onClearEdit?.();
      setText("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      return;
    }

    // ── Send new message ──
    const socket = getSocket();
    if (!socket) { toast.error("Not connected"); return; }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      _id: tempId, tempId,
      sender: { _id: user._id, name: user.name, profilePic: user.profilePic },
      content: text.trim(),
      chat: activeChat._id,
      messageType: "text",
      fileUrl: "", fileName: "",
      replyTo: replyTo
        ? { _id: replyTo._id, content: replyTo.content, messageType: replyTo.messageType,
            isDeleted: replyTo.isDeleted, sender: replyTo.sender }
        : null,
      seenBy: [user._id], deliveredTo: [user._id],
      reactions: [], createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    dispatch(optimisticAddMessage(optimisticMsg));
    dispatch(updateLatestMessage({ chatId: activeChat._id, message: optimisticMsg }));

    socket.emit("send_message", {
      chatId: activeChat._id, content: text.trim(),
      messageType: "text", fileUrl: "", fileName: "",
      tempId, replyTo: replyTo?._id || null,
    });

    clearTimeout(typingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("stop_typing", { chatId: activeChat._id });
    }

    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    onClearReply?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") { onClearReply?.(); onClearEdit?.(); setText(""); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max file size is 10MB"); return; }

    setUploading(true);
    setProgress(0);

    const socket = getSocket();
    if (!socket) { toast.error("Not connected"); setUploading(false); return; }

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => setProgress(Math.round((ev.loaded * 100) / ev.total)),
      });

      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      const msgType = isImage ? "image" : isAudio ? "audio" : "file";
      const tempId  = `temp_${Date.now()}_${Math.random()}`;

      const optimisticMsg = {
        _id: tempId, tempId,
        sender: { _id: user._id, name: user.name, profilePic: user.profilePic },
        content: "", chat: activeChat._id,
        messageType: msgType,
        fileUrl: res.data.url, fileName: res.data.name,
        replyTo: null, seenBy: [user._id], deliveredTo: [user._id],
        reactions: [], createdAt: new Date().toISOString(), isOptimistic: true,
      };

      dispatch(optimisticAddMessage(optimisticMsg));
      dispatch(updateLatestMessage({ chatId: activeChat._id, message: optimisticMsg }));

      socket.emit("send_message", {
        chatId: activeChat._id, content: "",
        messageType: msgType, fileUrl: res.data.url, fileName: res.data.name,
        tempId, replyTo: null,
      });

      toast.success("File sent!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false); setProgress(0); e.target.value = "";
    }
  };

  // ── Context bars (reply / edit) ────────────────────────────────────────
  const ContextBar = () => {
    if (editingMessage) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 border-t border-dark-600 border-l-2 border-l-amber-400">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-400 font-semibold">Editing message</p>
            <p className="text-xs text-gray-400 truncate">{editingMessage.content}</p>
          </div>
          <button onClick={() => { onClearEdit?.(); setText(""); }}
            className="text-gray-500 hover:text-white p-1 rounded hover:bg-dark-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
    if (replyTo) {
      const preview = replyTo.isDeleted ? "🚫 Deleted"
        : replyTo.messageType === "image" ? "📷 Image"
        : replyTo.messageType === "file"  ? "📎 File"
        : replyTo.messageType === "audio" ? "🎵 Audio"
        : (replyTo.content || "");
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 border-t border-dark-600 border-l-2 border-l-brand-500">
          <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-brand-400 font-semibold">{replyTo.sender?.name || "Unknown"}</p>
            <p className="text-xs text-gray-400 truncate">{preview}</p>
          </div>
          <button onClick={onClearReply}
            className="text-gray-500 hover:text-white p-1 rounded hover:bg-dark-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
    return null;
  };

  const isEditMode = !!editingMessage;

  return (
    <div className="bg-dark-800 border-t border-dark-600">
      <ContextBar />
      <div className="px-4 py-3 relative">
        {uploading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-dark-600">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        {showEmoji && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
            <div className="absolute bottom-full right-4 mb-2 z-20 shadow-2xl rounded-2xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={(e) => { setText((p) => p + e.emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                theme="dark" height={350} width={320} skinTonesDisabled
              />
            </div>
          </>
        )}
        <div className="flex items-end gap-2">
          {/* File upload — hidden in edit mode */}
          {!isEditMode && (
            <label className={`btn-ghost p-2 rounded-xl cursor-pointer flex-shrink-0 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
                accept="image/*,audio/*,video/mp4,.pdf,.doc,.docx,.txt,.zip" />
              {uploading ? (
                <div className="w-5 h-5 relative flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-dark-600 border-t-brand-400 rounded-full animate-spin" />
                  <span className="absolute text-[8px] text-brand-400 font-bold">{uploadProgress}</span>
                </div>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </label>
          )}

          <div className="flex-1 relative">
            <textarea ref={inputRef} value={text}
              onChange={(e) => { setText(e.target.value); if (!isEditMode) emitTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder={isEditMode ? "Edit your message..." : replyTo ? "Type your reply..." : "Message..."}
              rows={1}
              className={`input-field resize-none min-h-[44px] max-h-32 py-2.5 pr-10 leading-relaxed
                ${isEditMode ? "border-amber-500/50 focus:border-amber-400" : ""}`}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }}
            />
            <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmoji((v) => !v); }}
              className="absolute right-3 bottom-2.5 text-gray-500 hover:text-yellow-400 transition-colors z-20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <button onClick={handleSubmit} disabled={!text.trim()}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${text.trim()
                ? `${isEditMode ? "bg-amber-500 hover:bg-amber-600" : "bg-brand-500 hover:bg-brand-600"} text-white hover:scale-105 active:scale-95`
                : "bg-dark-700 text-gray-600 cursor-not-allowed"}`}>
            {isEditMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
