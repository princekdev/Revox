import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api.js";

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchChats = createAsyncThunk("chat/fetchChats", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/chats");
    return res.data.chats;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const accessChat = createAsyncThunk("chat/accessChat", async (userId, { rejectWithValue }) => {
  try {
    const res = await api.post("/chats", { userId });
    return res.data.chat;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const createGroupChat = createAsyncThunk("chat/createGroup", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/chats/group", data);
    return res.data.chat;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const renameGroup = createAsyncThunk("chat/renameGroup", async ({ id, chatName }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/chats/group/${id}`, { chatName });
    return res.data.chat;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const addToGroup = createAsyncThunk("chat/addToGroup", async ({ id, userId }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/chats/group/${id}/add`, { userId });
    return res.data.chat;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const removeFromGroup = createAsyncThunk("chat/removeFromGroup", async ({ id, userId }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/chats/group/${id}/remove`, { userId });
    return res.data.chat;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

export const deleteChat = createAsyncThunk("chat/deleteChat", async (chatId, { rejectWithValue }) => {
  try {
    await api.delete(`/chats/${chatId}`);
    return chatId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chats: [],
    activeChat: null,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveChat(state, action) {
      state.activeChat = action.payload;
    },

    updateLatestMessage(state, action) {
      const { chatId, message } = action.payload;
      const idx = state.chats.findIndex((c) => c._id === chatId);
      if (idx !== -1) {
        state.chats[idx] = {
          ...state.chats[idx],
          latestMessage: message,
          updatedAt: new Date().toISOString(),
        };
        // Bubble updated chat to top of list
        const [updated] = state.chats.splice(idx, 1);
        state.chats.unshift(updated);
      }
    },

    incrementUnread(state, action) {
      const { chatId, userId } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        if (!chat.unreadCount) chat.unreadCount = {};
        chat.unreadCount[userId] = (chat.unreadCount[userId] || 0) + 1;
      }
    },

    // ✅ Called both locally (on chat open) and via socket unread_reset event
    resetUnread(state, action) {
      const { chatId, userId } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        if (!chat.unreadCount) chat.unreadCount = {};
        chat.unreadCount[userId] = 0;
      }
    },

    updateUserOnlineStatus(state, action) {
      const { userId, isOnline, lastSeen } = action.payload;
      const updateUsers = (users) => {
        users?.forEach((u) => {
          if (u._id === userId) {
            u.isOnline = isOnline;
            if (lastSeen) u.lastSeen = lastSeen;
          }
        });
      };
      state.chats.forEach((chat) => updateUsers(chat.users));
      if (state.activeChat) updateUsers(state.activeChat.users);
    },

    addNewChat(state, action) {
      const exists = state.chats.some((c) => c._id === action.payload._id);
      if (!exists) state.chats.unshift(action.payload);
    },
  },

  extraReducers: (builder) => {
    builder
      // fetchChats
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        // Deduplicate by _id in case server returns dupes
        const seen = new Set();
        state.chats = action.payload.filter((c) => {
          if (seen.has(c._id)) return false;
          seen.add(c._id);
          return true;
        });
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // accessChat — replace if exists, prepend if new
      .addCase(accessChat.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) {
          state.chats[idx] = action.payload;
        } else {
          state.chats.unshift(action.payload);
        }
        state.activeChat = action.payload;
      })

      // createGroupChat
      .addCase(createGroupChat.fulfilled, (state, action) => {
        const exists = state.chats.some((c) => c._id === action.payload._id);
        if (!exists) state.chats.unshift(action.payload);
        state.activeChat = action.payload;
      })

      // renameGroup / addToGroup / removeFromGroup — update in place
      .addCase(renameGroup.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
        if (state.activeChat?._id === action.payload._id) state.activeChat = action.payload;
      })
      .addCase(addToGroup.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
        if (state.activeChat?._id === action.payload._id) state.activeChat = action.payload;
      })
      .addCase(removeFromGroup.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
        if (state.activeChat?._id === action.payload._id) state.activeChat = action.payload;
      })

      // deleteChat
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.chats = state.chats.filter((c) => c._id !== action.payload);
        if (state.activeChat?._id === action.payload) state.activeChat = null;
      });
  },
});

export const {
  setActiveChat,
  updateLatestMessage,
  incrementUnread,
  resetUnread,
  updateUserOnlineStatus,
  addNewChat,
} = chatSlice.actions;

export default chatSlice.reducer;
