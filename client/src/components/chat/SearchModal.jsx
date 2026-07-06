import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleSearchModal } from "../../redux/slices/uiSlice.js";
import { accessChat } from "../../redux/slices/chatSlice.js";
import api from "../../utils/api.js";
import Modal from "../common/Modal.jsx";
import Avatar from "../common/Avatar.jsx";
import Spinner from "../common/Spinner.jsx";

let searchTimeout;

export default function SearchModal() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);

  const handleSearch = useCallback((val) => {
    setQuery(val);
    clearTimeout(searchTimeout);
    if (!val.trim()) { setResults([]); return; }

    searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
        setResults(res.data.users);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleStart = async (userId) => {
    setStarting(userId);
    await dispatch(accessChat(userId));
    setStarting(null);
    dispatch(toggleSearchModal());
  };

  return (
    <Modal isOpen onClose={() => dispatch(toggleSearchModal())} title="Find People">
      <div className="space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div className="min-h-[200px] max-h-80 overflow-y-auto space-y-1">
          {loading ? (
            <Spinner />
          ) : results.length === 0 && query ? (
            <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              Type a name or email to search
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u._id}
                onClick={() => handleStart(u._id)}
                disabled={starting === u._id}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700 transition-colors text-left"
              >
                <Avatar src={u.profilePic} name={u.name} size="md" online={u.isOnline} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                {starting === u._id ? (
                  <Spinner size="sm" />
                ) : (
                  <span className="text-xs text-brand-400 flex-shrink-0">Chat →</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
