'use client';

import { Chat } from '@/modules/chat/Chat';

export default function ChatContent() {
  /* LiveTicker sits in document flow below the sticky header. */
  return (
    <div className='box-border flex h-[calc(100dvh-6rem)] w-full min-h-0 min-w-0 flex-col pt-6 lg:pt-10'>
      <Chat variant='inline' />
    </div>
  );
}
