import type { Metadata } from "next";
import StudioChatContent from "./page.client";

export const metadata: Metadata = {
  title: "THF Radio Studio Chat",
  description: "THF Radio studio live chat",
  robots: { index: false, follow: false },
};

export default function StudioChatPage() {
  return <StudioChatContent />;
}
