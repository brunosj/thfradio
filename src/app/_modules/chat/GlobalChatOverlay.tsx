"use client";

import { usePathname } from "next/navigation";
import { Chat } from "./Chat";
import {
  isGlobalChatOverlaySuppressed,
  normalizeAppPath,
} from "./chatRouteUtils";

/** Floating chat from the layout; hidden where `Chat` is embedded in the page. */
export function GlobalChatOverlay() {
  const pathname = usePathname();
  if (isGlobalChatOverlaySuppressed(normalizeAppPath(pathname))) {
    return null;
  }
  return <Chat variant="overlay" />;
}
