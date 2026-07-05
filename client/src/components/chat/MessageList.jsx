import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessages } from "../../redux/slices/messageSlice.js";
import MessageBubble from "./MessageBubble.jsx";
import Spinner from "../common/Spinner.jsx";
import { formatDateSeparator, isSameDay } from "../../utils/dateUtils.js";

export default function MessageList({ onReply, onEdit }) {
  const dispatch = useDispatch();
  const { messages, loading, loadingMore, hasMore, currentPage } = useSelector((s) => s.message);
  const { activeChat } = useSelector((s) => s.chat);
  const { user }       = useSelector((s) => s.auth);

  const bottomRef       = useRef(null);
  const topSentinelRef  = useRef(null);
  const containerRef    = useRef(null);
  const prevScrollHeight = useRef(0);

  // Scroll to bottom on new messages (not while loading older ones)
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loadingMore]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    if (loadingMore && containerRef.current) {
      prevScrollHeight.current = containerRef.current.scrollHeight;
    }
  }, [loadingMore]);
  useEffect(() => {
    if (!loadingMore && prevScrollHeight.current && containerRef.current) {
      containerRef.current.scrollTop += containerRef.current.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [messages, loadingMore]);

  // IntersectionObserver for infinite scroll
  const handleTopIntersect = useCallback((entries) => {
    if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
      dispatch(fetchMessages({ chatId: activeChat._id, page: currentPage + 1 }));
    }
  }, [hasMore, loadingMore, loading, currentPage, activeChat?._id, dispatch]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleTopIntersect, { threshold: 0.1 });
    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [handleTopIntersect]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-dark-900"><Spinner /></div>;
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1 bg-dark-900">
      <div ref={topSentinelRef} className="h-1" />
      {loadingMore && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}

      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
          <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No messages yet</p>
          <p className="text-gray-600 text-xs mt-1">Say hello! 👋</p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const prevMsg = messages[idx - 1];
        const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
        const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
        const showAvatar = activeChat?.isGroupChat && !isOwn;

        return (
          <div key={msg._id}>
            {showDateSep && (
              <div className="flex items-center justify-center my-4">
                <span className="bg-dark-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                  {formatDateSeparator(msg.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
              isGroupChat={activeChat?.isGroupChat}
              onReply={onReply}
              onEdit={onEdit}
            />
          </div>
        );
      })}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
