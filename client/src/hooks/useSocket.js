import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initSocket, getSocket } from "../utils/socket.js";
import {
  addMessage, replaceTempMessage,
  updateEditedMessage, markDeletedForEveryone, removeMessageForMe,
  setPinnedMessage,
  setTyping, removeTyping, updateMessageStatus, markMessagesSeenLocal, updateReaction,
} from "../redux/slices/messageSlice.js";
import {
  updateLatestMessage, updateUserOnlineStatus, resetUnread, incrementUnread,
} from "../redux/slices/chatSlice.js";
import { addNotification } from "../redux/slices/uiSlice.js";

export const useSocket = () => {
  const dispatch  = useDispatch();
  const { token, user }   = useSelector((s) => s.auth);
  const { activeChat }    = useSelector((s) => s.chat);
  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;

  useEffect(() => {
    if (!token || !user) return;

    const socket = initSocket(token);
    socket.emit("setup");

    const onMessageSent = ({ message }) => {
      dispatch(replaceTempMessage(message));
      dispatch(updateLatestMessage({ chatId: message.chat?._id || message.chat, message }));
    };

    const onMessageReceived = ({ message }) => {
      const chatId = message.chat?._id || message.chat;
      if (activeChatRef.current?._id === chatId) {
        dispatch(addMessage(message));
      } else {
        dispatch(incrementUnread({ chatId, userId: user._id }));
      }
      dispatch(updateLatestMessage({ chatId, message }));
    };

    const onNotification = ({ message }) => {
      const chatId = message.chat?._id || message.chat;
      if (activeChatRef.current?._id !== chatId) {
        dispatch(addNotification({
          type: "message",
          text: `${message.sender?.name}: ${message.content || "Sent a file"}`,
          chatId,
        }));
      }
    };

    const onUnreadReset = ({ chatId, userId }) => {
      dispatch(resetUnread({ chatId, userId }));
    };

    // Message edits
    const onMessageEdited = ({ message }) => {
      dispatch(updateEditedMessage(message));
    };

    // Delete for everyone — grey out bubble for all users
    const onMessageDeleted = ({ messageId, scope }) => {
      if (scope === "everyone") dispatch(markDeletedForEveryone(messageId));
      else                       dispatch(removeMessageForMe(messageId));
    };

    // Pin
    const onMessagePinned = ({ message, isPinned }) => {
      dispatch(setPinnedMessage({ message, isPinned }));
    };

    const onTyping      = ({ chatId, user: u }) => dispatch(setTyping({ chatId, user: u }));
    const onStopTyping  = ({ chatId, userId }) => dispatch(removeTyping({ chatId, userId }));
    const onUserOnline  = (p) => dispatch(updateUserOnlineStatus(p));
    const onMessagesSeen = ({ seenBy }) => dispatch(markMessagesSeenLocal({ userId: seenBy }));
    const onStatusUpdate = ({ messageId, deliveredTo }) => dispatch(updateMessageStatus({ messageId, deliveredTo }));
    const onReaction     = ({ messageId, reactions }) => dispatch(updateReaction({ messageId, reactions }));

    const onMissedCallMessage = ({ message, chatId }) => {
      if (activeChatRef.current?._id === chatId) dispatch(addMessage(message));
      dispatch(updateLatestMessage({ chatId, message }));
    };

    socket.on("message_sent",             onMessageSent);
    socket.on("message_received",         onMessageReceived);
    socket.on("new_message_notification", onNotification);
    socket.on("unread_reset",             onUnreadReset);
    socket.on("message_edited",           onMessageEdited);
    socket.on("message_deleted",          onMessageDeleted);
    socket.on("message_pinned",           onMessagePinned);
    socket.on("typing",                   onTyping);
    socket.on("stop_typing",              onStopTyping);
    socket.on("user_online",              onUserOnline);
    socket.on("messages_seen",            onMessagesSeen);
    socket.on("message_status_update",    onStatusUpdate);
    socket.on("reaction_updated",         onReaction);
    socket.on("missed_call_message",      onMissedCallMessage);

    return () => {
      socket.off("message_sent",             onMessageSent);
      socket.off("message_received",         onMessageReceived);
      socket.off("new_message_notification", onNotification);
      socket.off("unread_reset",             onUnreadReset);
      socket.off("message_edited",           onMessageEdited);
      socket.off("message_deleted",          onMessageDeleted);
      socket.off("message_pinned",           onMessagePinned);
      socket.off("typing",                   onTyping);
      socket.off("stop_typing",              onStopTyping);
      socket.off("user_online",              onUserOnline);
      socket.off("messages_seen",            onMessagesSeen);
      socket.off("message_status_update",    onStatusUpdate);
      socket.off("reaction_updated",         onReaction);
      socket.off("missed_call_message",      onMissedCallMessage);
    };
  }, [token, user?._id, dispatch]); // eslint-disable-line

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeChat) return;
    socket.emit("join_chat", activeChat._id);
    socket.emit("mark_seen", { chatId: activeChat._id });
    return () => socket.emit("leave_chat", activeChat._id);
  }, [activeChat?._id]);
};
