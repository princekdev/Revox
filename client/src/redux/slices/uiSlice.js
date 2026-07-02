import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    sidebarOpen: true,
    showProfileModal: false,
    showGroupModal: false,
    showSearchModal: false,
    showChatInfo: false,
    darkMode: true,
    notifications: [], // { id, message, type }
  },
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen(state, action) { state.sidebarOpen = action.payload; },
    toggleProfileModal(state) { state.showProfileModal = !state.showProfileModal; },
    toggleGroupModal(state) { state.showGroupModal = !state.showGroupModal; },
    toggleSearchModal(state) { state.showSearchModal = !state.showSearchModal; },
    toggleChatInfo(state) { state.showChatInfo = !state.showChatInfo; },
    toggleDarkMode(state) { state.darkMode = !state.darkMode; },
    addNotification(state, action) {
      state.notifications.push({ id: Date.now(), ...action.payload });
    },
    removeNotification(state, action) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar, setSidebarOpen,
  toggleProfileModal, toggleGroupModal,
  toggleSearchModal, toggleChatInfo,
  toggleDarkMode, addNotification, removeNotification,
} = uiSlice.actions;
export default uiSlice.reducer;
