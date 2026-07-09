import { useSelector } from "react-redux";
import { getSocket } from "../../utils/socket.js";

export default function PinnedMessageBanner() {
  const { pinnedMessage } = useSelector((s) => s.message);
  const { activeChat }    = useSelector((s) => s.chat);

  if (!pinnedMessage) return null;

  const preview = pinnedMessage.isDeleted ? "🚫 Deleted message"
    : pinnedMessage.messageType === "image" ? "📷 Image"
    : pinnedMessage.messageType === "file"  ? "📎 File"
    : pinnedMessage.messageType === "audio" ? "🎵 Audio"
    : pinnedMessage.content || "";

  const handleUnpin = (e) => {
    e.stopPropagation();
    const socket = getSocket();
    socket?.emit("pin_message", {
      messageId: pinnedMessage._id,
      chatId: activeChat._id,
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-dark-800 border-b border-dark-600
      border-l-2 border-l-yellow-400 cursor-pointer hover:bg-dark-700 transition-colors">
      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-yellow-400 font-semibold">Pinned Message</p>
        <p className="text-xs text-gray-400 truncate">{preview}</p>
      </div>
      <button
        onClick={handleUnpin}
        className="text-gray-500 hover:text-white p-1 rounded transition-colors flex-shrink-0"
        title="Unpin message"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
