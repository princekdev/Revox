import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessages, clearMessages } from "../../redux/slices/messageSlice.js";
import { resetUnread } from "../../redux/slices/chatSlice.js";
import { getSocket } from "../../utils/socket.js";
import MessageList from "./MessageList.jsx";
import MessageInput from "./MessageInput.jsx";
import ChatHeader from "./ChatHeader.jsx";
import ChatInfoPanel from "./ChatInfoPanel.jsx";
import PinnedMessageBanner from "./PinnedMessageBanner.jsx";

export default function ChatWindow({ onStartCall, onBack }) {
  const dispatch   = useDispatch();
  const { activeChat } = useSelector((s) => s.chat);
  const { user }       = useSelector((s) => s.auth);
  const { showChatInfo } = useSelector((s) => s.ui);

  const [replyTo,         setReplyTo]         = useState(null);
  const [editingMessage,  setEditingMessage]   = useState(null);

  useEffect(() => {
    if (!activeChat?._id) return;
    if (user?._id) dispatch(resetUnread({ chatId: activeChat._id, userId: user._id }));
    dispatch(clearMessages());
    dispatch(fetchMessages({ chatId: activeChat._id, page: 1 }));
    setReplyTo(null);
    setEditingMessage(null);
    const socket = getSocket();
    if (socket) socket.emit("mark_seen", { chatId: activeChat._id });
  }, [activeChat?._id, dispatch, user?._id]);

  if (!activeChat) return null;

  return (
    <div className="flex flex-1 min-w-0 h-full">
      <div className="flex flex-col flex-1 min-w-0">
        <ChatHeader onStartCall={onStartCall} onBack={onBack} />
        <PinnedMessageBanner />
        <MessageList onReply={setReplyTo} onEdit={setEditingMessage} />
        <MessageInput
          replyTo={replyTo}         onClearReply={() => setReplyTo(null)}
          editingMessage={editingMessage} onClearEdit={() => setEditingMessage(null)}
        />
      </div>
      {showChatInfo && <ChatInfoPanel />}
    </div>
  );
}
