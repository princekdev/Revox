import { useDispatch } from "react-redux";
import { toggleSearchModal } from "../../redux/slices/uiSlice.js";

export default function WelcomeScreen() {
  const dispatch = useDispatch();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-dark-900 p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-sm">
        <div className="w-20 h-20 bg-dark-700 border border-dark-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>

        <h2 className="font-display text-2xl font-bold mb-2">Pulse Chat</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Select a conversation from the sidebar or start a new chat to begin messaging.
        </p>

        <button
          onClick={() => dispatch(toggleSearchModal())}
          className="btn-primary px-6 py-2.5 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find someone to chat with
        </button>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "⚡", label: "Real-time" },
            { icon: "🔒", label: "Secure" },
            { icon: "👥", label: "Group chats" },
          ].map((f) => (
            <div key={f.label} className="bg-dark-800 rounded-xl p-3 border border-dark-600">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs text-gray-500">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
