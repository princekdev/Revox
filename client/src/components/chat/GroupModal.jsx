import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { toggleGroupModal } from "../../redux/slices/uiSlice.js";
import { createGroupChat } from "../../redux/slices/chatSlice.js";
import api from "../../utils/api.js";
import Modal from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import Spinner from "../common/Spinner.jsx";
import { toast } from "react-toastify";

let searchTimeout;

export default function GroupModal() {
  const dispatch = useDispatch();
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSearch = useCallback((val) => {
    setQuery(val);
    clearTimeout(searchTimeout);
    if (!val.trim()) { setResults([]); return; }

    searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        setResults(res.data.users);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    if (selected.length < 2) { toast.error("Add at least 2 members"); return; }
    setCreating(true);
    try {
      await dispatch(createGroupChat({ chatName: groupName.trim(), users: selected.map((u) => u._id) }));
      dispatch(toggleGroupModal());
    } catch (e) {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen onClose={() => dispatch(toggleGroupModal())} title="New Group Chat">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="input-field"
        />

        {/* Selected members */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u._id}
                className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-600/30 text-brand-300 text-xs rounded-full px-2.5 py-1"
              >
                {u.name}
                <button onClick={() => toggleSelect(u)} className="hover:text-white">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search users to add..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="input-field"
        />

        {/* Results */}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {loading ? <Spinner /> : results.map((u) => {
            const isSelected = selected.find((s) => s._id === u._id);
            return (
              <button
                key={u._id}
                onClick={() => toggleSelect(u)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left
                  ${isSelected ? "bg-brand-600/20 border border-brand-600/30" : "hover:bg-dark-700"}`}
              >
                <Avatar src={u.profilePic} name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                {isSelected && <span className="text-brand-400 text-lg">✓</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
        >
          {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : `Create Group (${selected.length} members)`}
        </button>
      </div>
    </Modal>
  );
}
