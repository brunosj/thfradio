'use client';

import Script from 'next/script';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import { useEffect, useRef } from 'react';
import { SyntheticEvent } from 'react';

export default function SoundcloudPlayer() {
  const trackId = useGlobalStore((state) => state.trackId);
  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const widgetRef = useRef<ReturnType<typeof window.SC.Widget> | null>(null);

  // Cleanup when component unmounts or player changes
  useEffect(() => {
    return () => {
      if (widgetRef.current) {
        widgetRef.current.pause();
        widgetRef.current = null;
      }
      const iframe = document.getElementById(
        'soundcloud-player'
      ) as HTMLIFrameElement;
      if (iframe) {
        iframe.src = 'about:blank';
      }
    };
  }, [activePlayer]);

  const handleIframeLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    try {
      if (!window.SC) {
        console.error('Soundcloud API not loaded');
        return;
      }

      const widget = window.SC.Widget(event.currentTarget);
      widgetRef.current = widget;

      widget.bind('ready', () => {
        if (activePlayer === ActivePlayer.SOUNDCLOUD) {
          widget.play();
        }
      });
    } catch (error) {
      console.error('Soundcloud widget error:', error);
    }
  };

  console.log('SoundcloudWidget render:', { trackId, activePlayer });

  return (
    <>
      <Script
        src='https://w.soundcloud.com/player/api.js'
        strategy='beforeInteractive'
      />
      {trackId && (
        <div className='fixed bottom-0 left-0 w-full lg:w-5/6'>
          <iframe
            id='soundcloud-player'
            height={120}
            width='100%'
            allow='autoplay'
            onLoad={handleIframeLoad}
            src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&inverse=false&auto_play=true&show_user=true&visual=false&show_teaser=false&show_comments=false&show_reposts=false&show_artwork=false&sharing=false&download=false&origin=${encodeURIComponent(window.location.origin)}`}
          />
        </div>
      )}
    </>
  );
}
