"use client";

import { usePathname } from "next/navigation";
import { useChatState } from "@/app/_context/ChatContext";
import {
  isGlobalChatOverlaySuppressed,
  normalizeAppPath,
} from "@/modules/chat/chatRouteUtils";

export default function JoinChatMobile() {
  const pathname = usePathname();
  const { isChatOpen, setIsChatOpen } = useChatState();

  if (isGlobalChatOverlaySuppressed(normalizeAppPath(pathname))) {
    return null;
  }

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
