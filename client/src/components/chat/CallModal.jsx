import { useState, useEffect, useRef } from "react";
import Avatar from "../common/Avatar.jsx";

export default function CallModal({ callState, localVideoRef, remoteVideoRef, onAnswer, onReject, onEnd, onToggleMute, onToggleCamera }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  const { status, callType, caller } = callState;
  const isVideo = callType === "video";

  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleMute = () => {
    const enabled = onToggleMute();
    setIsMuted(enabled === false);
  };

  const handleCamera = () => {
    const enabled = onToggleCamera();
    setIsCameraOff(enabled === false);
  };

  if (status === "idle") return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Incoming call screen */}
      {status === "incoming" && (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-brand-500 ring-offset-4 ring-offset-black animate-pulse">
            <Avatar src={caller?.profilePic} name={caller?.name} size="xl" />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-display font-bold">{caller?.name}</p>
            <p className="text-gray-400 mt-1">
              Incoming {isVideo ? "📹 video" : "📞 voice"} call...
            </p>
          </div>
          <div className="flex gap-6 mt-4">
            {/* Reject */}
            <button
              onClick={onReject}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/30"
            >
              <svg className="w-7 h-7 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
            {/* Answer */}
            <button
              onClick={onAnswer}
              className="w-16 h-16 bg-brand-500 hover:bg-brand-600 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-brand-500/30"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Calling / Connected screen */}
      {(status === "calling" || status === "connected") && (
        <div className="flex flex-col w-full h-full max-w-2xl mx-auto p-4">
          {/* Remote video (full background) */}
          {isVideo ? (
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-dark-800">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {status === "calling" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-800">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-brand-500/50 mb-4">
                    <Avatar src={null} name={caller?.name || "?"} size="xl" />
                  </div>
                  <p className="text-white text-xl font-semibold">{caller?.name || "Calling..."}</p>
                  <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                    Ringing
                    <span className="flex gap-0.5">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </p>
                </div>
              )}

              {/* Local video PiP */}
              <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-dark-600 bg-dark-900 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex items-center justify-center bg-dark-700">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Audio call — no video
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-brand-500 ring-offset-4 ring-offset-black mb-4">
                <Avatar src={caller?.profilePic} name={caller?.name} size="xl" />
              </div>
              <p className="text-white text-2xl font-display font-bold">{caller?.name}</p>
              <p className="text-gray-400 mt-2 text-lg">
                {status === "connected" ? (
                  <span className="text-brand-400 font-mono">{formatDuration(callDuration)}</span>
                ) : (
                  <span className="flex items-center gap-1">
                    Calling
                    <span className="flex gap-0.5 ml-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </span>
                )}
              </p>
              {/* Hidden audio elements for audio calls */}
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            </div>
          )}

          {/* Duration (video call) */}
          {isVideo && status === "connected" && (
            <div className="text-center py-2">
              <span className="text-brand-400 font-mono text-sm">{formatDuration(callDuration)}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 py-4">
            {/* Mute */}
            <button
              onClick={handleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
                ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-dark-600 hover:bg-dark-500"}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 9v6m-3.536-4.536a5 5 0 000 5.072M19.07 4.929a10 10 0 010 14.142"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a3 3 0 013 3v2a3 3 0 01-6 0V9a3 3 0 013-3z"/>
                </svg>
              )}
            </button>

            {/* End call */}
            <button
              onClick={onEnd}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/30"
              title="End call"
            >
              <svg className="w-7 h-7 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>

            {/* Toggle camera (video only) */}
            {isVideo && (
              <button
                onClick={handleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
                  ${isCameraOff ? "bg-red-500 hover:bg-red-600" : "bg-dark-600 hover:bg-dark-500"}`}
                title={isCameraOff ? "Turn camera on" : "Turn camera off"}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isCameraOff
                      ? "M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3zM1 1l22 22"
                      : "M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z"
                    }
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
