'use client';

import { Chat } from '@/modules/chat/Chat';

export default function ChatContent() {
  /* Top padding clears the fixed LiveTicker (`top-16`, out of flow) so the chat header is not covered. */
  return (
    <div className='box-border flex h-[calc(100dvh-6rem)] w-full min-h-0 min-w-0 flex-col pt-6 lg:pt-10'>
      <Chat variant='inline' />
    </div>
  );
}
