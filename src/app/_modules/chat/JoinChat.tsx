"use client";

import { useChatState } from "@/app/_context/ChatContext";
import { Chat } from "./Chat";

export default function JoinChat() {
  const { isChatOpen, setIsChatOpen } = useChatState();

  return (
    <div className="fixed bottom-2 right-2 hidden lg:block z-50">
      <div className="flex flex-col items-end gap-2">
        {/* Chat Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer hover:scale-105 duration-300 animate-bounce"
          aria-label="Toggle chat"
        >
          <span className="hidden lg:inline">
            {isChatOpen ? "Close Chat" : "Join the chat!"}
          </span>
        </button>

        {/* Chat Component */}
        <Chat />
      </div>
    </div>
  );
}
