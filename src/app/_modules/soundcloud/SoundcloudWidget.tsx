'use client';

import Script from 'next/script';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import { useEffect, useRef, useState } from 'react';
import { SyntheticEvent } from 'react';

export default function SoundcloudPlayer() {
  const trackId = useGlobalStore((state) => state.trackId);
  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const widgetRef = useRef<ReturnType<typeof window.SC.Widget> | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Cleanup function
  const cleanup = () => {
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

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Handle player changes
  useEffect(() => {
    if (activePlayer !== ActivePlayer.SOUNDCLOUD) {
      cleanup();
    }
  }, [activePlayer]);

  const handleIframeLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    if (!isScriptLoaded) {
      console.warn('Waiting for Soundcloud API to load...');
      return;
    }

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

  if (!trackId) return null;

  return (
    <>
      <Script
        src='https://w.soundcloud.com/player/api.js'
        strategy='beforeInteractive'
        onLoad={() => setIsScriptLoaded(true)}
      />
      <iframe
        id='soundcloud-player'
        height={120}
        width='100%'
        allow='autoplay'
        onLoad={handleIframeLoad}
        src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&inverse=false&auto_play=true&show_user=true&visual=false&show_teaser=false&show_comments=false&show_reposts=false&show_artwork=false&sharing=false&download=false&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
        className='fixed bottom-0 left-0 w-3/4 bg-white p-3 '
      />
    </>
  );
}
