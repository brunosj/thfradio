"use client";

import { Link } from "@/i18n/routing";
import { useChatState } from "@/app/_context/ChatContext";

export default function JoinChatMobile() {
  const { isChatOpen, setIsChatOpen } = useChatState();

  return (
    <div className="pb-5 pt-2">
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer transition-transform duration-200"
      >
        {isChatOpen ? "Close Chat" : "Join the chat!"}
      </button>
    </div>
  );
}
