import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

export const formatMessageTime = (date) => {
  const d = new Date(date);
  return format(d, "HH:mm");
};

export const formatChatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yy");
};

export const formatLastSeen = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `last seen ${formatDistanceToNow(d, { addSuffix: true })}`;
};

export const formatDateSeparator = (date) => {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

export const isSameDay = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
};
