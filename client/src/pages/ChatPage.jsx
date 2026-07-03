import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChats } from "../redux/slices/chatSlice.js";
import { useSocket } from "../hooks/useSocket.js";
import { useCall } from "../hooks/useCall.js";
import Sidebar from "../components/chat/Sidebar.jsx";
import ChatWindow from "../components/chat/ChatWindow.jsx";
import WelcomeScreen from "../components/chat/WelcomeScreen.jsx";
import ProfileModal from "../components/chat/ProfileModal.jsx";
import GroupModal from "../components/chat/GroupModal.jsx";
import SearchModal from "../components/chat/SearchModal.jsx";
import CallModal from "../components/chat/CallModal.jsx";

export default function ChatPage() {
  const dispatch = useDispatch();
  const { activeChat } = useSelector((s) => s.chat);
  const { showProfileModal, showGroupModal, showSearchModal } = useSelector((s) => s.ui);

  // Mobile: true = show sidebar, false = show chat
  const [showSidebar, setShowSidebar] = useState(true);

  useSocket();

  const {
    callState, localVideoRef, remoteVideoRef,
    startCall, answerCall, rejectCall, endCall,
    toggleMute, toggleCamera,
  } = useCall();

  useEffect(() => { dispatch(fetchChats()); }, [dispatch]);

  // Auto-switch to chat view when a chat is selected
  useEffect(() => {
    if (activeChat) setShowSidebar(false);
  }, [activeChat?._id]);

  return (
    <div className="h-screen flex bg-dark-900 overflow-hidden">
      {/* Sidebar ── full-screen on mobile, fixed-width on desktop */}
      <div className={`
        flex-shrink-0 transition-all duration-200
        ${showSidebar ? "flex" : "hidden"} sm:flex
        w-full sm:w-80
      `}>
        <Sidebar onChatSelect={() => setShowSidebar(false)} />
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${!showSidebar ? "flex" : "hidden"} sm:flex
      `}>
        {activeChat
          ? <ChatWindow
              onStartCall={startCall}
              onBack={() => setShowSidebar(true)}
            />
          : <WelcomeScreen />
        }
      </div>

      {/* Modals */}
      {showProfileModal && <ProfileModal />}
      {showGroupModal   && <GroupModal />}
      {showSearchModal  && <SearchModal />}

      {/* Call overlay */}
      {callState.status !== "idle" && (
        <CallModal
          callState={callState}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onAnswer={answerCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}
    </div>
  );
}
