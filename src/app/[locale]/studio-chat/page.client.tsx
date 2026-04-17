"use client";

import { Chat } from "@/modules/chat/Chat";

export default function StudioChatContent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Chat variant="studio" />
    </div>
  );
}
