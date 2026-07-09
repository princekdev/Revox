import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleChatInfo } from "../../redux/slices/uiSlice.js";
import { renameGroup, addToGroup, removeFromGroup } from "../../redux/slices/chatSlice.js";
import api from "../../utils/api.js";
import Avatar from "../common/Avatar.jsx";
import { formatLastSeen } from "../../utils/dateUtils.js";
import { toast } from "react-toastify";

export default function ChatInfoPanel() {
  const dispatch   = useDispatch();
  const { activeChat } = useSelector((s) => s.chat);
  const { user }       = useSelector((s) => s.auth);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName]         = useState(activeChat?.chatName || "");
  const [nickname, setNickname]       = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [addQuery, setAddQuery]       = useState("");
  const [addResults, setAddResults]   = useState([]);

  const isAdmin = activeChat?.groupAdmin?._id === user?._id ||
                  activeChat?.groupAdmin === user?._id;

  const otherUser = !activeChat?.isGroupChat
    ? activeChat?.users?.find((u) => u._id !== user?._id)
    : null;

  // Current nickname this user has set for the other person
  const currentNickname = activeChat?.nicknames?.[user?._id] || "";

  const handleRenameGroup = async () => {
    if (!newName.trim()) return;
    await dispatch(renameGroup({ id: activeChat._id, chatName: newName.trim() }));
    setEditingName(false);
    toast.success("Group renamed");
  };

  const handleSaveNickname = async () => {
    try {
      await api.put(`/chats/${activeChat._id}/nickname`, { nickname: nickname.trim() });
      toast.success(nickname.trim() ? "Nickname saved" : "Nickname cleared");
      setEditingNick(false);
    } catch {
      toast.error("Failed to save nickname");
    }
  };

  const searchUsers = async (q) => {
    setAddQuery(q);
    if (!q.trim()) { setAddResults([]); return; }
    const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    const members = activeChat.users?.map((u) => u._id) || [];
    setAddResults(res.data.users.filter((u) => !members.includes(u._id)));
  };

  const handleAdd = async (userId) => {
    await dispatch(addToGroup({ id: activeChat._id, userId }));
    setAddQuery(""); setAddResults([]);
    toast.success("Member added");
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    await dispatch(removeFromGroup({ id: activeChat._id, userId }));
    toast.success("Member removed");
  };

  return (
    <div className="w-72 flex-shrink-0 bg-dark-800 border-l border-dark-600 flex flex-col overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-600">
        <h3 className="font-display font-semibold">
          {activeChat?.isGroupChat ? "Group Info" : "Contact Info"}
        </h3>
        <button onClick={() => dispatch(toggleChatInfo())} className="btn-ghost p-1.5 rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-2 py-2">
          <Avatar
            src={activeChat?.isGroupChat ? activeChat.groupPic : otherUser?.profilePic}
            name={activeChat?.isGroupChat ? activeChat.chatName : otherUser?.name}
            size="xl"
            online={!activeChat?.isGroupChat ? otherUser?.isOnline : undefined}
          />

          {activeChat?.isGroupChat ? (
            /* ── Group rename ─────────────────────────────────────────── */
            editingName ? (
              <div className="flex gap-2 w-full mt-1">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="input-field text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()}
                  placeholder="Group name"
                  autoFocus
                />
                <button onClick={handleRenameGroup} className="btn-primary px-3 py-1.5 text-xs">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <p className="font-semibold">{activeChat.chatName}</p>
                {isAdmin && (
                  <button onClick={() => { setNewName(activeChat.chatName); setEditingName(true); }}
                    className="text-gray-500 hover:text-gray-300 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )
          ) : (
            /* ── 1-1 contact info + nickname ──────────────────────────── */
            <>
              <p className="font-semibold">{otherUser?.name}</p>
              <p className="text-xs text-gray-500">{otherUser?.email}</p>
              <p className={`text-xs ${otherUser?.isOnline ? "text-brand-400" : "text-gray-500"}`}>
                {otherUser?.isOnline ? "Online" : formatLastSeen(otherUser?.lastSeen)}
              </p>

              {/* Custom nickname for 1-1 chat */}
              <div className="w-full mt-2 bg-dark-700 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1.5">Custom nickname</p>
                {editingNick ? (
                  <div className="flex gap-2">
                    <input value={nickname} onChange={(e) => setNickname(e.target.value)}
                      className="input-field text-xs flex-1 py-1.5"
                      placeholder="Set nickname…"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                      autoFocus
                    />
                    <button onClick={handleSaveNickname} className="btn-primary px-2 py-1 text-xs">Save</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{currentNickname || "None"}</span>
                    <button
                      onClick={() => { setNickname(currentNickname); setEditingNick(true); }}
                      className="text-xs text-brand-400 hover:text-brand-300">
                      {currentNickname ? "Edit" : "Set"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Group members */}
        {activeChat?.isGroupChat && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Members ({activeChat.users?.length})
            </p>
            <div className="space-y-1">
              {activeChat.users?.map((u) => (
                <div key={u._id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-dark-700">
                  <Avatar src={u.profilePic} name={u.name} size="sm" online={u.isOnline} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.name}
                      {(u._id === activeChat.groupAdmin?._id || u._id === activeChat.groupAdmin) && (
                        <span className="ml-1.5 text-[10px] text-brand-400 bg-brand-400/10 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </p>
                  </div>
                  {isAdmin && u._id !== user?._id && (
                    <button onClick={() => handleRemove(u._id)}
                      className="text-gray-600 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add member (admin only) */}
            {isAdmin && (
              <div className="mt-3">
                <input type="text" placeholder="Add member…" value={addQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                  className="input-field text-sm"
                />
                {addResults.map((u) => (
                  <button key={u._id} onClick={() => handleAdd(u._id)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-dark-700 mt-1">
                    <Avatar src={u.profilePic} name={u.name} size="sm" />
                    <span className="text-sm flex-1 text-left">{u.name}</span>
                    <span className="text-xs text-brand-400">Add +</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
