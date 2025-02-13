'use client';

import Script from 'next/script';
import { SyntheticEvent, useRef } from 'react';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

export default function MixcloudPlayer() {
  const showKey = useGlobalStore((state) => state.showKey);
  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const widgetRef = useRef<ReturnType<
    typeof window.Mixcloud.PlayerWidget
  > | null>(null);

  const handleIframeLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    try {
      if (!window.Mixcloud) {
        console.error('Mixcloud API not loaded');
        return;
      }

      const widget = window.Mixcloud.PlayerWidget(event.currentTarget);
      await widget.ready;
      widgetRef.current = widget;
      if (activePlayer === ActivePlayer.MIXCLOUD) {
        await widget.play();
      }
    } catch (error) {
      console.error('Mixcloud widget error:', error);
    }
  };

  return (
    <>
      <Script
        src='https://widget.mixcloud.com/media/js/widgetApi.js'
        strategy='beforeInteractive'
      />
      {showKey && (
        <iframe
          allow='autoplay'
          onLoad={handleIframeLoad}
          id='mixcloud-player'
          height={60}
          className='fixed bottom-0 left-0 w-full lg:w-5/6'
          src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&dark=1&mini=1&feed=${showKey}`}
        />
      )}
    </>
  );
}
