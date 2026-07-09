import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../utils/socket.js";
import { addMessage } from "../redux/slices/messageSlice.js";
import { updateLatestMessage } from "../redux/slices/chatSlice.js";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const CALL_TIMEOUT_MS = 30000; // 30s ring timeout → missed call

export const useCall = () => {
  const dispatch = useDispatch();
  const { activeChat } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);

  const [callState, setCallState] = useState({
    status: "idle",   // idle | calling | incoming | connected
    callType: null,   // "video" | "audio"
    caller: null,
    chatId: null,
  });

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const callStateRef = useRef(callState);
  const callTimeoutRef = useRef(null);
  callStateRef.current = callState;

  // ── Cleanup all WebRTC resources ───────────────────────────────────────
  const cleanup = useCallback((skipStateReset = false) => {
    clearTimeout(callTimeoutRef.current);
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingOfferRef.current = null;
    if (!skipStateReset) {
      setCallState({ status: "idle", callType: null, caller: null, chatId: null });
    }
  }, []);

  // ── Build RTCPeerConnection ────────────────────────────────────────────
  const createPeer = useCallback((chatId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) getSocket()?.emit("ice_candidate", { chatId, candidate });
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        endCall();
      }
    };

    return pc;
  }, []); // eslint-disable-line

  // ── Initiate call ─────────────────────────────────────────────────────
  const startCall = useCallback(async (chatId, callType = "video") => {
    try {
      const socket = getSocket();
      if (!socket) return;

      setCallState({ status: "calling", callType, caller: user, chatId });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(chatId);
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call_user", { chatId, offer, callType });

      // Auto-cancel after 30s if no answer → missed call
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current.status === "calling") {
          socket.emit("call_missed", { chatId, callType, callerName: user.name });
          cleanup();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err) {
      console.error("startCall:", err);
      cleanup();
      if (err.name === "NotAllowedError") {
        alert("Camera/microphone permission denied.");
      }
    }
  }, [user, createPeer, cleanup]);

  // ── Answer incoming call ───────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    try {
      const socket = getSocket();
      if (!socket || !pendingOfferRef.current) return;
      const { offer, callType, chatId } = pendingOfferRef.current;

      clearTimeout(callTimeoutRef.current);
      setCallState((p) => ({ ...p, status: "connected" }));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(chatId);
      peerRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call_answer", { chatId, answer });
    } catch (err) {
      console.error("answerCall:", err);
      cleanup();
    }
  }, [createPeer, cleanup]);

  // ── Reject call ───────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const socket = getSocket();
    const { chatId, callType, caller } = callStateRef.current;
    if (socket && chatId) {
      socket.emit("call_rejected", { chatId });
      // Emit missed call so sender sees a notification in chat
      socket.emit("call_missed", { chatId, callType, callerName: caller?.name });
    }
    cleanup();
  }, [cleanup]);

  // ── End active call ───────────────────────────────────────────────────
  const endCall = useCallback(() => {
    const socket = getSocket();
    const { chatId } = callStateRef.current;
    if (socket && chatId) socket.emit("call_ended", { chatId });
    cleanup();
  }, [cleanup]);

  // ── Toggle mute/camera ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
  }, []);

  // ── Socket event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = ({ from, offer, callType, chatId }) => {
      pendingOfferRef.current = { offer, callType, chatId };
      setCallState({ status: "incoming", callType, caller: from, chatId });

      // Auto-timeout: if not answered in 30s, treat as missed
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current.status === "incoming") {
          socket.emit("call_missed", { chatId, callType, callerName: from.name });
          cleanup();
        }
      }, CALL_TIMEOUT_MS);
    };

    const onCallAnswered = async ({ answer }) => {
      try {
        clearTimeout(callTimeoutRef.current);
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState((p) => ({ ...p, status: "connected" }));
        }
      } catch (err) { console.error("call_answered:", err); }
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) { console.error("ice_candidate:", err); }
    };

    const onCallRejected = () => {
      clearTimeout(callTimeoutRef.current);
      cleanup();
    };

    const onCallEnded = () => {
      cleanup();
    };

    // Missed call message injected into chat by server — receive it here
    const onMissedCallMessage = ({ message, chatId }) => {
      const currentChatId = activeChat?._id;
      if (currentChatId === chatId) {
        dispatch(addMessage(message));
      }
      dispatch(updateLatestMessage({ chatId, message }));
    };

    socket.on("incoming_call", onIncomingCall);
    socket.on("call_answered", onCallAnswered);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_rejected", onCallRejected);
    socket.on("call_ended", onCallEnded);
    socket.on("missed_call_message", onMissedCallMessage);

    return () => {
      socket.off("incoming_call", onIncomingCall);
      socket.off("call_answered", onCallAnswered);
      socket.off("ice_candidate", onIceCandidate);
      socket.off("call_rejected", onCallRejected);
      socket.off("call_ended", onCallEnded);
      socket.off("missed_call_message", onMissedCallMessage);
    };
  }, [activeChat?._id, dispatch, cleanup]);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
};
