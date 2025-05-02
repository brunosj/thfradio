'use client';

import Script from 'next/script';
import { SyntheticEvent, useRef, useEffect, useState } from 'react';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

export default function MixcloudPlayer() {
  const showKey = useGlobalStore((state) => state.showKey);
  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const resetPlayer = useGlobalStore((state) => state.resetPlayer);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedReload, setHasAttemptedReload] = useState(false);
  const widgetRef = useRef<ReturnType<
    typeof window.Mixcloud.PlayerWidget
  > | null>(null);

  // Get origin for widget URL
  const getOrigin = () => {
    if (typeof window === 'undefined') return '';
    return encodeURIComponent(window.location.origin);
  };

  // Get the full URL for the iframe
  const getWidgetUrl = () => {
    if (!showKey) return '';
    return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&dark=1&mini=1&feed=${showKey}&origin=${getOrigin()}`;
  };

  // Cleanup function
  const cleanup = () => {
    if (widgetRef.current) {
      try {
        widgetRef.current.pause();
      } catch (err) {
        console.error('Error pausing Mixcloud player:', err);
      }
      widgetRef.current = null;
    }
    const iframe = document.getElementById(
      'mixcloud-player'
    ) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'about:blank';
    }
    setError(null);
  };

  // Function to handle close button click
  const handleClose = () => {
    console.log('Closing Mixcloud player');
    cleanup();
    resetPlayer();
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Handle player changes
  useEffect(() => {
    if (activePlayer !== ActivePlayer.MIXCLOUD) {
      cleanup();
    }
  }, [activePlayer]);

  // Check if Mixcloud API is already loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Mixcloud) {
      setApiLoaded(true);
    }
  }, []);

  const handleScriptLoad = () => {
    console.log('Mixcloud API script loaded');
    setApiLoaded(true);
  };

  const handleScriptError = () => {
    console.error('Failed to load Mixcloud API script');
    setError('Failed to load Mixcloud player');
  };

  // Mixcloud event type (approximation)
  interface MixcloudEvents {
    error: {
      on: (callback: () => void) => void;
    };
  }

  // Extended widget type
  interface MixcloudPlayerWidgetExtended {
    ready: Promise<void>;
    pause: () => void;
    play: () => Promise<void>;
    events: MixcloudEvents;
  }

  const handleIframeLoad = async (
    event: SyntheticEvent<HTMLIFrameElement, Event>
  ) => {
    try {
      // Wait for API to be loaded
      if (!apiLoaded) {
        console.log('Waiting for Mixcloud API to load...');
        // We'll handle this in the useEffect when apiLoaded changes
        return;
      }

      if (!window.Mixcloud) {
        console.error('Mixcloud API not loaded');
        setError('Mixcloud player failed to load');
        return;
      }

      console.log('Initializing Mixcloud widget');
      const widget = window.Mixcloud.PlayerWidget(event.currentTarget);

      // Listen for errors - use try/catch since TS doesn't know about events
      try {
        // Use the extended widget type
        const extendedWidget =
          widget as unknown as MixcloudPlayerWidgetExtended;
        if (extendedWidget.events && extendedWidget.events.error) {
          extendedWidget.events.error.on(() => {
            console.error('Mixcloud widget error event');
            setError('Error playing this show');

            // If we haven't tried reloading yet, try once
            if (!hasAttemptedReload) {
              console.log('Attempting to reload widget');
              setHasAttemptedReload(true);

              const iframe = document.getElementById(
                'mixcloud-player'
              ) as HTMLIFrameElement;
              if (iframe) {
                iframe.src = getWidgetUrl();
              }
            }
          });
        }
      } catch (err: unknown) {
        console.error('Error setting up Mixcloud error handler:', err);
      }

      await widget.ready;
      console.log('Mixcloud widget ready');
      widgetRef.current = widget;
      if (activePlayer === ActivePlayer.MIXCLOUD) {
        await widget.play();
      }
    } catch (error: unknown) {
      console.error('Mixcloud widget initialization error:', error);
      setError('Failed to initialize Mixcloud player');
    }
  };

  // Initialize widget when iframe is loaded and API is ready
  useEffect(() => {
    if (!apiLoaded || !showKey) return;

    const iframe = document.getElementById(
      'mixcloud-player'
    ) as HTMLIFrameElement;
    if (iframe && window.Mixcloud) {
      try {
        console.log('Initializing Mixcloud widget from useEffect');
        const widget = window.Mixcloud.PlayerWidget(iframe);
        widget.ready
          .then(() => {
            console.log('Mixcloud widget ready from useEffect');
            widgetRef.current = widget;
            if (activePlayer === ActivePlayer.MIXCLOUD) {
              widget.play().catch((err: unknown) => {
                console.error('Error playing:', err);
                setError('Error playing this show');
              });
            }
          })
          .catch((err: unknown) => {
            console.error('Widget ready error:', err);
            setError('Widget failed to initialize');
          });
      } catch (error) {
        console.error('Error initializing Mixcloud widget:', error);
        setError('Failed to initialize player');
      }
    }
  }, [apiLoaded, showKey, activePlayer]);

  if (!showKey) return null;

  return (
    <>
      <Script
        src='https://widget.mixcloud.com/media/js/widgetApi.js'
        strategy='afterInteractive'
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />
      <div className='fixed bottom-0 left-0 w-full lg:w-5/6 bg-white'>
        {/* Error message if needed */}
        {error && (
          <div className='bg-red-100 text-red-600 p-1 text-xs text-center'>
            {error}
          </div>
        )}
        <div className='relative'>
          <iframe
            allow='autoplay'
            onLoad={handleIframeLoad}
            id='mixcloud-player'
            height={60}
            className='w-full'
            src={getWidgetUrl()}
          />
          {/* Close button */}
          <button
            onClick={handleClose}
            className='absolute top-2 right-2 hover:scale-110 transition-transform duration-300 text-gray-500 hover:text-red-500 hover:cursor-pointer'
            aria-label='Close player'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='18' y1='6' x2='6' y2='18'></line>
              <line x1='6' y1='6' x2='18' y2='18'></line>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
