'use client';

import LiveStreamAudio from '@/modules/live-radio/LiveStreamAudio';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LiveStreamAudio />
      {children}
    </>
  );
}
