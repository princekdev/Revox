import { useDispatch, useSelector } from "react-redux";
import { toggleChatInfo } from "../../redux/slices/uiSlice.js";
import { setActiveChat } from "../../redux/slices/chatSlice.js";
import Avatar from "../common/Avatar.jsx";
import { formatLastSeen } from "../../utils/dateUtils.js";

export default function ChatHeader({ onStartCall, onBack }) {
  const dispatch = useDispatch();
  const { activeChat }  = useSelector((s) => s.chat);
  const { user }        = useSelector((s) => s.auth);
  const { typingUsers } = useSelector((s) => s.message);
  const { showChatInfo } = useSelector((s) => s.ui);

  const otherUser = activeChat?.isGroupChat
    ? null
    : activeChat?.users?.find((u) => u._id !== user?._id);

  const name = activeChat?.isGroupChat ? activeChat.chatName : otherUser?.name;
  const pic  = activeChat?.isGroupChat ? activeChat.groupPic  : otherUser?.profilePic;
  const isOnline = !activeChat?.isGroupChat && otherUser?.isOnline;

  const chatTyping  = typingUsers[activeChat?._id] || [];
  const typingNames = chatTyping.filter((u) => u._id !== user?._id).map((u) => u.name);

  const statusText = typingNames.length > 0
    ? (typingNames.length === 1 ? `${typingNames[0]} is typing…` : "Several people are typing…")
    : activeChat?.isGroupChat
      ? `${activeChat.users?.length || 0} members`
      : isOnline ? "Online" : formatLastSeen(otherUser?.lastSeen);

  const handleBack = () => {
    // On mobile: go back to sidebar without deselecting chat
    if (onBack) {
      onBack();
    } else {
      dispatch(setActiveChat(null));
    }
  };

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-dark-800 border-b border-dark-600">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Back button — always visible on small screens */}
        <button className="sm:hidden btn-ghost p-1.5 rounded-xl flex-shrink-0" onClick={handleBack}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button onClick={() => dispatch(toggleChatInfo())}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0">
          <Avatar src={pic} name={name} size="md"
            online={!activeChat?.isGroupChat ? isOnline : undefined} />
          <div className="text-left min-w-0">
            <p className="font-semibold text-sm leading-tight truncate max-w-[120px] sm:max-w-none">{name}</p>
            <p className={`text-xs leading-tight ${typingNames.length > 0 ? "text-brand-400" : isOnline ? "text-brand-400" : "text-gray-500"}`}>
              {typingNames.length > 0 ? (
                <span className="flex items-center gap-1">
                  {statusText}
                  <span className="flex gap-0.5 ml-1">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </span>
                </span>
              ) : statusText}
            </p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Voice call */}
        <button onClick={() => onStartCall?.(activeChat._id, "audio")}
          className="btn-ghost p-2 rounded-xl" title="Voice call">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        {/* Video call */}
        <button onClick={() => onStartCall?.(activeChat._id, "video")}
          className="btn-ghost p-2 rounded-xl" title="Video call">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
          </svg>
        </button>
        {/* Info panel */}
        <button onClick={() => dispatch(toggleChatInfo())}
          className={`btn-ghost p-2 rounded-xl ${showChatInfo ? "text-brand-400 bg-dark-700" : ""}`}
          title="Chat Info">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
