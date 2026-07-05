import { useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../../utils/socket.js";
import { markDeletedForEveryone, removeMessageForMe } from "../../redux/slices/messageSlice.js";
import Avatar from "../common/Avatar.jsx";
import { formatMessageTime } from "../../utils/dateUtils.js";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({ message, isOwn, showAvatar, isGroupChat, onReply, onEdit }) {
  const dispatch = useDispatch();
  const { user }       = useSelector((s) => s.auth);
  const { activeChat } = useSelector((s) => s.chat);

  const [showActions,   setShowActions]   = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hideTimerRef = useRef(null);
  const isOptimistic = !!message.isOptimistic;

  // ── Delay hide so cursor can travel from bubble → action bar ──────────
  const startHide = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setShowActions(false);
      setShowReactions(false);
      setShowDeleteMenu(false);
    }, 300);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteForMe = (e) => {
    e.stopPropagation();
    const socket = getSocket();
    socket?.emit("delete_message", {
      messageId: message._id,
      chatId: activeChat._id,
      scope: "me",
    });
    dispatch(removeMessageForMe(message._id));
    setShowDeleteMenu(false);
    setShowActions(false);
  };

  const handleDeleteForEveryone = (e) => {
    e.stopPropagation();
    const socket = getSocket();
    socket?.emit("delete_message", {
      messageId: message._id,
      chatId: activeChat._id,
      scope: "everyone",
    });
    dispatch(markDeletedForEveryone(message._id));
    setShowDeleteMenu(false);
    setShowActions(false);
  };

  // ── Edit ───────────────────────────────────────────────────────────────
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(message);
    setShowActions(false);
  };

  // ── Reply ──────────────────────────────────────────────────────────────
  const handleReply = (e) => {
    e.stopPropagation();
    onReply?.(message);
    setShowActions(false);
  };

  // ── React ──────────────────────────────────────────────────────────────
  const handleReact = (emoji) => {
    const socket = getSocket();
    if (socket && !isOptimistic) {
      socket.emit("react_to_message", {
        messageId: message._id,
        emoji,
        chatId: activeChat._id,
      });
    }
    setShowReactions(false);
    setShowActions(false);
  };

  // ── Pin ────────────────────────────────────────────────────────────────
  const handlePin = (e) => {
    e.stopPropagation();
    const socket = getSocket();
    socket?.emit("pin_message", { messageId: message._id, chatId: activeChat._id });
    setShowActions(false);
  };

  // ── Status ticks ──────────────────────────────────────────────────────
  const StatusIcon = () => {
    if (!isOwn) return null;
    if (isOptimistic) return <span className="text-gray-600 text-[10px]">⏳</span>;

    const others = (activeChat?.users || []).filter(
      (u) => (u._id || u) !== (user?._id)
    );
    const allSeen = others.length > 0 && others.every((u) =>
      (message.seenBy || []).some((s) => (s._id || s) === (u._id || u))
    );

    if (allSeen) {
      return (
        <svg className="w-4 h-3 text-brand-400 flex-shrink-0" viewBox="0 0 18 10"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 5l3.5 4L12 1"/><path d="M6 5l3.5 4L17 1"/>
        </svg>
      );
    }
    if ((message.deliveredTo || []).length > 1) {
      return (
        <svg className="w-4 h-3 text-gray-500 flex-shrink-0" viewBox="0 0 18 10"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 5l3.5 4L12 1"/><path d="M6 5l3.5 4L17 1"/>
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 12 10"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M1 5l3.5 4L11 1"/>
      </svg>
    );
  };

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // ── Reply quote ───────────────────────────────────────────────────────
  const ReplyQuote = () => {
    const r = message.replyTo;
    if (!r) return null;
    const preview = r.isDeleted ? "🚫 Deleted"
      : r.messageType === "image" ? "📷 Image"
      : r.messageType === "file"  ? "📎 File"
      : r.messageType === "audio" ? "🎵 Audio"
      : (r.content || "");
    return (
      <div className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 border-brand-400 text-xs
        ${isOwn ? "bg-brand-700/40" : "bg-dark-600/60"}`}>
        <p className="text-brand-300 font-semibold truncate">{r.sender?.name || "Unknown"}</p>
        <p className="text-gray-400 truncate">{preview}</p>
      </div>
    );
  };

  // ── Content renderer ──────────────────────────────────────────────────
  const renderContent = () => {
    if (message.isDeleted) {
      return <p className="text-sm italic opacity-60">🚫 This message was deleted</p>;
    }
    return (
      <>
        {message.messageType === "image" && message.fileUrl && (
          <div className="mb-1.5">
            {imgError ? (
              <div className="bg-dark-600 rounded-xl p-3 text-xs text-gray-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image unavailable
              </div>
            ) : (
              <img src={message.fileUrl} alt="Shared image"
                className="max-w-xs max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onError={() => setImgError(true)}
                onClick={() => window.open(message.fileUrl, "_blank")}
                loading="lazy"
              />
            )}
          </div>
        )}
        {message.messageType === "audio" && message.fileUrl && (
          <div className="mb-1.5 min-w-[220px]">
            <audio controls className="w-full h-8 rounded-lg"
              style={{ filter: "invert(0.8) hue-rotate(180deg)" }}>
              <source src={message.fileUrl} />
            </audio>
            {message.fileName && <p className="text-[10px] text-gray-400 mt-1 truncate">{message.fileName}</p>}
          </div>
        )}
        {message.messageType === "file" && message.fileUrl && (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-black/20 rounded-xl p-2.5 mb-1.5 hover:bg-black/30 transition-colors group/file">
            <div className="w-9 h-9 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate max-w-[180px] group-hover/file:underline">
                {message.fileName || "Download File"}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">
                {message.fileName?.split(".").pop() || "file"}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {/* Edited label */}
        {message.isEdited && !message.isDeleted && (
          <span className="text-[10px] opacity-40 ml-1 italic">edited</span>
        )}
      </>
    );
  };

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}
        ${isOptimistic ? "opacity-75" : "opacity-100"} transition-opacity`}
      onMouseEnter={cancelHide}
      onMouseLeave={startHide}
    >
      {showAvatar ? (
        <div className="flex-shrink-0 self-end mb-1">
          <Avatar src={message.sender?.profilePic} name={message.sender?.name} size="xs" />
        </div>
      ) : <div className="w-7 flex-shrink-0" />}

      <div className={`max-w-[68%] relative flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {isGroupChat && !isOwn && (
          <span className="text-xs text-brand-400 mb-1 ml-1 font-medium">{message.sender?.name}</span>
        )}

        {/* Pinned indicator */}
        {message.isPinned && (
          <span className="text-[10px] text-yellow-400 mb-0.5 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
            Pinned
          </span>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm
            ${isOwn ? "bg-brand-600 text-white rounded-br-sm" : "bg-dark-700 text-gray-100 rounded-bl-sm"}
            ${message.isDeleted ? "opacity-60" : ""}`}
          onMouseEnter={() => {
            cancelHide();
            if (!message.isDeleted && !isOptimistic) setShowActions(true);
          }}
        >
          <ReplyQuote />
          {renderContent()}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] opacity-50">{formatMessageTime(message.createdAt)}</span>
            <StatusIcon />
          </div>
        </div>

        {/* Reaction pills */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex gap-1 flex-wrap mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className="bg-dark-700 border border-dark-600 rounded-full px-1.5 py-0.5 text-xs
                  flex items-center gap-0.5 hover:bg-dark-600 transition-colors">
                <span>{emoji}</span>
                {count > 1 && <span className="text-gray-400">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Action bar */}
        {showActions && (
          <div
            className={`absolute ${isOwn ? "right-full mr-2" : "left-full ml-2"}
              top-0 flex items-center gap-1 z-10 animate-fade-in`}
            onMouseEnter={cancelHide}
            onMouseLeave={startHide}
          >
            {/* Reply */}
            <button onClick={handleReply} title="Reply"
              className="p-1.5 bg-dark-700 border border-dark-600 rounded-xl hover:bg-dark-600 transition-colors">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* Edit (own text messages only) */}
            {isOwn && message.messageType === "text" && !message.isDeleted && (
              <button onClick={handleEdit} title="Edit message"
                className="p-1.5 bg-dark-700 border border-dark-600 rounded-xl hover:bg-dark-600 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Pin */}
            <button onClick={handlePin} title={message.isPinned ? "Unpin" : "Pin message"}
              className="p-1.5 bg-dark-700 border border-dark-600 rounded-xl hover:bg-dark-600 transition-colors">
              <svg className={`w-3.5 h-3.5 ${message.isPinned ? "text-yellow-400" : "text-gray-400"}`}
                fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            </button>

            {/* Emoji reaction */}
            <div className="relative" onMouseEnter={cancelHide} onMouseLeave={startHide}>
              <button onClick={(e) => { e.stopPropagation(); setShowReactions((v) => !v); }}
                className="p-1.5 bg-dark-700 border border-dark-600 rounded-xl hover:bg-dark-600 transition-colors">
                😊
              </button>
              {showReactions && (
                <div className="absolute bottom-full mb-2 flex gap-1 bg-dark-800 border border-dark-600
                  rounded-2xl p-2 shadow-2xl animate-fade-in whitespace-nowrap"
                  onMouseEnter={cancelHide} onClick={(e) => e.stopPropagation()}>
                  {EMOJI_LIST.map((e) => (
                    <button key={e} onClick={() => handleReact(e)}
                      className="text-xl hover:scale-125 transition-transform p-0.5 leading-none">{e}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete menu */}
            <div className="relative" onMouseEnter={cancelHide} onMouseLeave={startHide}>
              <button onClick={(e) => { e.stopPropagation(); setShowDeleteMenu((v) => !v); }}
                title="Delete"
                className="p-1.5 bg-dark-700 border border-dark-600 rounded-xl hover:bg-red-900/40 hover:border-red-700 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {showDeleteMenu && (
                <div className="absolute bottom-full mb-2 bg-dark-800 border border-dark-600 rounded-xl
                  shadow-2xl overflow-hidden animate-fade-in min-w-[160px]"
                  onMouseEnter={cancelHide} onClick={(e) => e.stopPropagation()}>
                  {/* Delete for Me — available to everyone */}
                  <button onClick={handleDeleteForMe}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Delete for Me
                  </button>
                  {/* Delete for Everyone — only sender */}
                  {isOwn && !message.isDeleted && (
                    <button onClick={handleDeleteForEveryone}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition-colors flex items-center gap-2 border-t border-dark-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete for Everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
