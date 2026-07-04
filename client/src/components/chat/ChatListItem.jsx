import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteChat } from "../../redux/slices/chatSlice.js";
import Avatar from "../common/Avatar.jsx";
import { formatChatTime } from "../../utils/dateUtils.js";
import { toast } from "react-toastify";

export default function ChatListItem({ chat, isActive, currentUser, onClick }) {
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const otherUser = chat.isGroupChat
    ? null
    : chat.users?.find((u) => u._id !== currentUser?._id);

  const name = chat.isGroupChat ? chat.chatName : otherUser?.name || "Unknown";
  const pic = chat.isGroupChat ? chat.groupPic : otherUser?.profilePic;
  const isOnline = !chat.isGroupChat && otherUser?.isOnline;
  const unread = chat.unreadCount?.[currentUser?._id] || 0;

  const lastMsg = chat.latestMessage;
  let preview = "No messages yet";
  if (lastMsg) {
    if (lastMsg.isDeleted) preview = "🚫 Message deleted";
    else if (lastMsg.messageType === "image") preview = "📷 Image";
    else if (lastMsg.messageType === "file") preview = "📎 File";
    else if (lastMsg.messageType === "audio") preview = "🎵 Audio";
    else preview = lastMsg.content || "";
  }

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete this conversation with ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await dispatch(deleteChat(chat._id)).unwrap();
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group/item
        ${isActive ? "bg-dark-700 border-r-2 border-brand-500" : "hover:bg-dark-700/50"}`}
      onClick={onClick}
      onMouseLeave={() => setShowMenu(false)}
    >
      <Avatar src={pic} name={name} size="md" online={!chat.isGroupChat ? isOnline : undefined} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-medium text-sm truncate pr-2">{name}</span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatChatTime(lastMsg?.createdAt || chat.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate pr-2">{preview}</p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-brand-500 text-white
              text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>

      {/* ⋮ context menu button — shows on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100
          p-1 rounded-lg hover:bg-dark-600 transition-all text-gray-400 hover:text-white"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div
          className="absolute right-2 top-10 z-30 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl
            overflow-hidden min-w-[140px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400
              hover:bg-red-900/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? "Deleting..." : "Delete Chat"}
          </button>
        </div>
      )}
    </div>
  );
}
