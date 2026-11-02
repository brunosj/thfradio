"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/_common/layout/header/Header";
import LiveTicker from "@/modules/live-ticker/LiveTicker";
import CalendarSchedule from "@/app/_modules/timetable_v2/CalendarSchedule";
import JoinChat from "@/modules/chat/JoinChat";
import { GlobalChatOverlay } from "@/modules/chat/GlobalChatOverlay";
import Footer from "@/app/_common/layout/footer/Footer";
import CloudPlayer from "@/app/_modules/player/CloudPlayer";
import PlayerErrorBoundary from "@/app/_modules/player/PlayerErrorBoundary";
import { useGlobalStore } from "@/hooks/useStore";
import { normalizeAppPath } from "@/modules/chat/chatRouteUtils";

export function LocaleLayoutChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const path = normalizeAppPath(pathname);
  const isStudioChat = path.endsWith("/studio-chat");
  // A player error hides the bar until the next track, never the page
  const playerKey = useGlobalStore((s) => s.trackId ?? s.showKey);

  if (isStudioChat) {
    return (
      <div className="flex h-dvh w-full min-h-0 flex-col overflow-hidden bg-white">
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="sticky top-0 z-50 w-full">
          <Header />
          <LiveTicker />
          {/* Week schedule, folded out from the ticker */}
          <CalendarSchedule />
        </div>
        <main>{children}</main>
      </div>
      <Footer />
      <PlayerErrorBoundary resetKey={playerKey}>
        <CloudPlayer />
      </PlayerErrorBoundary>
      <JoinChat />
      <GlobalChatOverlay />
    </>
  );
}
