"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/_common/layout/header/Header";
import LiveTicker from "@/modules/live-ticker/LiveTicker";
import JoinChat from "@/modules/chat/JoinChat";
import { GlobalChatOverlay } from "@/modules/chat/GlobalChatOverlay";
import Footer from "@/app/_common/layout/footer/Footer";
import CloudPlayer from "@/app/_modules/player/CloudPlayer";
import VideoStreamPopup from "@/app/_modules/video-stream/VideoStreamPopup";
import { normalizeAppPath } from "@/modules/chat/chatRouteUtils";

export function LocaleLayoutChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const path = normalizeAppPath(pathname);
  const isStudioChat = path.endsWith("/studio-chat");

  if (isStudioChat) {
    return (
      <div className="flex h-dvh w-full min-h-0 flex-col overflow-hidden bg-white">
        {children}
      </div>
    );
  }

  return (
    <>
      <LiveTicker />
      <div className="relative">
        <Header />
        <main>{children}</main>
      </div>
      <Footer />
      <CloudPlayer />
      <JoinChat />
      <GlobalChatOverlay />
      <VideoStreamPopup />
    </>
  );
}
