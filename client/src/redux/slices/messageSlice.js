import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api.js";

export const fetchMessages = createAsyncThunk(
  "message/fetchMessages",
  async ({ chatId, page = 1 }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/messages/${chatId}?page=${page}`);
      return { ...res.data, chatId, page };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    currentPage: 1,
    typingUsers: {},  // { chatId: [{ _id, name }] }
    pinnedMessage: null,
    error: null,
  },
  reducers: {
    clearMessages(state) {
      state.messages = [];
      state.hasMore = false;
      state.currentPage = 1;
      state.pinnedMessage = null;
    },

    addMessage(state, action) {
      const exists = state.messages.some((m) => m._id === action.payload._id);
      if (!exists) state.messages.push(action.payload);
    },

    optimisticAddMessage(state, action) {
      state.messages.push(action.payload);
    },

    replaceTempMessage(state, action) {
      const real = action.payload;
      const idx = state.messages.findIndex((m) => m.tempId && m.tempId === real.tempId);
      if (idx !== -1) {
        state.messages[idx] = real;
      } else {
        const exists = state.messages.some((m) => m._id === real._id);
        if (!exists) state.messages.push(real);
      }
    },

    // Edit message in place
    updateEditedMessage(state, action) {
      const idx = state.messages.findIndex((m) => m._id === action.payload._id);
      if (idx !== -1) state.messages[idx] = action.payload;
    },

    // Delete for everyone — mark as deleted
    markDeletedForEveryone(state, action) {
      const msg = state.messages.find((m) => m._id === action.payload);
      if (msg) {
        msg.isDeleted = true;
        msg.content   = "This message was deleted";
        msg.fileUrl   = "";
        msg.fileName  = "";
      }
    },

    // Delete for me — remove from local array entirely
    removeMessageForMe(state, action) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },

    setPinnedMessage(state, action) {
      // action.payload: { message, isPinned }
      state.pinnedMessage = action.payload.isPinned ? action.payload.message : null;
      const msg = state.messages.find((m) => m._id === action.payload.message._id);
      if (msg) msg.isPinned = action.payload.isPinned;
    },

    updateMessageStatus(state, action) {
      const { messageId, seenBy, deliveredTo } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) {
        if (seenBy)      msg.seenBy      = seenBy;
        if (deliveredTo) msg.deliveredTo = deliveredTo;
      }
    },

    markMessagesSeenLocal(state, action) {
      const { userId } = action.payload;
      state.messages.forEach((m) => {
        if (!m.seenBy) m.seenBy = [];
        if (!m.seenBy.includes(userId)) m.seenBy.push(userId);
      });
    },

    setTyping(state, action) {
      const { chatId, user } = action.payload;
      if (!state.typingUsers[chatId]) state.typingUsers[chatId] = [];
      if (!state.typingUsers[chatId].some((u) => u._id === user._id))
        state.typingUsers[chatId].push(user);
    },

    removeTyping(state, action) {
      const { chatId, userId } = action.payload;
      if (state.typingUsers[chatId])
        state.typingUsers[chatId] = state.typingUsers[chatId].filter((u) => u._id !== userId);
    },

    updateReaction(state, action) {
      const { messageId, reactions } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) msg.reactions = reactions;
    },

    // Legacy (kept for safety — use markDeletedForEveryone / removeMessageForMe instead)
    deleteMessageLocal(state, action) {
      const msg = state.messages.find((m) => m._id === action.payload);
      if (msg) { msg.isDeleted = true; msg.content = "This message was deleted"; }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        if (action.meta.arg.page > 1) state.loadingMore = true;
        else state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.hasMore     = action.payload.hasMore;
        state.currentPage = action.payload.currentPage;
        if (action.payload.page > 1) {
          state.messages = [...action.payload.messages, ...state.messages];
        } else {
          state.messages = action.payload.messages;
          // Restore pinned from loaded messages
          state.pinnedMessage = action.payload.messages.find((m) => m.isPinned) || null;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearMessages, addMessage, optimisticAddMessage, replaceTempMessage,
  updateEditedMessage, markDeletedForEveryone, removeMessageForMe,
  setPinnedMessage, updateMessageStatus, markMessagesSeenLocal,
  setTyping, removeTyping, updateReaction, deleteMessageLocal,
} = messageSlice.actions;
export default messageSlice.reducer;
