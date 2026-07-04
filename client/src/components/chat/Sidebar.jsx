import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveChat } from "../../redux/slices/chatSlice.js";
import { toggleProfileModal, toggleGroupModal, toggleSearchModal } from "../../redux/slices/uiSlice.js";
import { logout } from "../../redux/slices/authSlice.js";
import { disconnectSocket } from "../../utils/socket.js";
import Avatar from "../common/Avatar.jsx";
import ChatListItem from "./ChatListItem.jsx";
import Spinner from "../common/Spinner.jsx";

export default function Sidebar({ onChatSelect }) {
  const dispatch = useDispatch();
  const { user }  = useSelector((s) => s.auth);
  const { chats, loading, activeChat } = useSelector((s) => s.chat);
  const [search, setSearch] = useState("");

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
  };

  const filteredChats = chats.filter((chat) => {
    const name = chat.isGroupChat
      ? chat.chatName
      : chat.users?.find((u) => u._id !== user?._id)?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleChatSelect = (chat) => {
    dispatch(setActiveChat(chat));
    onChatSelect?.(); // signal parent to hide sidebar on mobile
  };

  return (
    <div className="flex flex-col h-full bg-dark-800 border-r border-dark-600">
      {/* Header */}
      <div className="p-4 border-b border-dark-600">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold">Pulse</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => dispatch(toggleGroupModal())}
              className="btn-ghost p-2 rounded-xl" title="New Group">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
            <button onClick={() => dispatch(toggleSearchModal())}
              className="btn-ghost p-2 rounded-xl" title="Find People">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search chats…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-sm" />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Spinner />
        ) : filteredChats.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {search ? "No chats found" : "No conversations yet"}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={activeChat?._id === chat._id}
              currentUser={user}
              onClick={() => handleChatSelect(chat)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-dark-600 flex items-center gap-3">
        <button onClick={() => dispatch(toggleProfileModal())}
          className="flex items-center gap-3 flex-1 hover:bg-dark-700 rounded-xl p-2 transition-colors">
          <Avatar src={user?.profilePic} name={user?.name} size="sm" online />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-brand-400">Online</p>
          </div>
        </button>
        <button onClick={handleLogout}
          className="btn-ghost p-2 rounded-xl text-gray-500 hover:text-red-400" title="Logout">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
