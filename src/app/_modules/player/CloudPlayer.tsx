'use client';

import Script from 'next/script';
import { SyntheticEvent, useRef, useEffect, useState } from 'react';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

export default function CloudPlayer() {
  const showKey = useGlobalStore((state) => state.showKey);
  const trackId = useGlobalStore((state) => state.trackId);
  const activePlayer = useGlobalStore((state) => state.activePlayer);

  const mixcloudRef = useRef<ReturnType<
    typeof window.Mixcloud.PlayerWidget
  > | null>(null);
  const soundcloudRef = useRef<ReturnType<typeof window.SC.Widget> | null>(
    null
  );
  const [isSoundcloudLoaded, setIsSoundcloudLoaded] = useState(false);

  // Cleanup function for Mixcloud
  const cleanupMixcloud = async () => {
    try {
      if (mixcloudRef.current) {
        await mixcloudRef.current.pause();
        mixcloudRef.current = null;
      }
      const iframe = document.getElementById(
        'mixcloud-player'
      ) as HTMLIFrameElement;
      if (iframe) {
        iframe.remove();
      }
    } catch (error) {
      console.error('Error cleaning up Mixcloud:', error);
    }
  };

  // Cleanup function for Soundcloud
  const cleanupSoundcloud = async () => {
    try {
      if (soundcloudRef.current) {
        soundcloudRef.current.pause();
        soundcloudRef.current = null;
      }
      const iframe = document.getElementById(
        'soundcloud-player'
      ) as HTMLIFrameElement;
      if (iframe) {
        iframe.remove();
      }
    } catch (error) {
      console.error('Error cleaning up Soundcloud:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMixcloud();
      cleanupSoundcloud();
    };
  }, []);

  // Handle player changes
  useEffect(() => {
    const handlePlayerChange = async () => {
      switch (activePlayer) {
        case ActivePlayer.MIXCLOUD:
          await cleanupSoundcloud();
          break;
        case ActivePlayer.SOUNDCLOUD:
          await cleanupMixcloud();
          break;
        default:
          await Promise.all([cleanupMixcloud(), cleanupSoundcloud()]);
      }
    };

    handlePlayerChange();
  }, [activePlayer]);

  const handleMixcloudLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    try {
      if (!window.Mixcloud) {
        console.error('Mixcloud API not loaded');
        return;
      }

      const widget = window.Mixcloud.PlayerWidget(event.currentTarget);
      await widget.ready;
      mixcloudRef.current = widget;
      if (activePlayer === ActivePlayer.MIXCLOUD) {
        await widget.play();
      }
    } catch (error) {
      console.error('Mixcloud widget error:', error);
    }
  };

  const handleSoundcloudLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    if (!isSoundcloudLoaded) {
      console.warn('Waiting for Soundcloud API to load...');
      return;
    }

    try {
      if (!window.SC) {
        console.error('Soundcloud API not loaded');
        return;
      }

      const widget = window.SC.Widget(event.currentTarget);
      soundcloudRef.current = widget;

      widget.bind('ready', () => {
        if (activePlayer === ActivePlayer.SOUNDCLOUD) {
          widget.play();
        }
      });
    } catch (error) {
      console.error('Soundcloud widget error:', error);
    }
  };

  return (
    <>
      {/* Scripts */}
      <Script
        src='https://widget.mixcloud.com/media/js/widgetApi.js'
        strategy='beforeInteractive'
      />
      <Script
        src='https://w.soundcloud.com/player/api.js'
        strategy='beforeInteractive'
        onLoad={() => setIsSoundcloudLoaded(true)}
      />

      {/* Players */}
      {showKey && activePlayer === ActivePlayer.MIXCLOUD && (
        <div className='fixed bottom-0 left-0 w-full'>
          <iframe
            allow='autoplay'
            onLoad={handleMixcloudLoad}
            id='mixcloud-player'
            height={60}
            className='w-full'
            src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&dark=1&mini=1&feed=${showKey}`}
          />
        </div>
      )}

      {trackId && activePlayer === ActivePlayer.SOUNDCLOUD && (
        <div className='fixed bottom-0 left-0 w-full bg-white p-3'>
          <iframe
            id='soundcloud-player'
            height={20}
            width='100%'
            allow='autoplay'
            onLoad={handleSoundcloudLoad}
            src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&inverse=false&auto_play=true&show_user=true&visual=false&show_teaser=false&show_comments=false&show_reposts=false&show_artwork=false&sharing=false&download=false&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
          />
        </div>
      )}
    </>
  );
}
