"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useChatState } from "@/app/_context/ChatContext";
import {
  isGlobalChatOverlaySuppressed,
  normalizeAppPath,
} from "@/modules/chat/chatRouteUtils";
import { EVENTS, track } from "@/app/_lib/analytics";

export default function JoinChatMobile() {
  const pathname = usePathname();
  const { isChatOpen, setIsChatOpen } = useChatState();
  const t = useTranslations();

  if (isGlobalChatOverlaySuppressed(normalizeAppPath(pathname))) {
    return null;
  }

  return (
    <div className="pb-5 pt-2">
      <button
        type="button"
        onClick={() => {
          if (!isChatOpen) track(EVENTS.openChat);
          setIsChatOpen(!isChatOpen);
        }}
        className="inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer transition-transform duration-200"
        aria-label={isChatOpen ? t("chat.close") : t("chat.join")}
      >
        {isChatOpen ? t("chat.close") : t("chat.join")}
      </button>
    </div>
  );
}