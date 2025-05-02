import { useEffect, useRef, useState, useCallback } from 'react';

// Define our custom Mixcloud widget interface
export interface CustomMixcloudWidget {
  ready: Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  getIsPaused: () => Promise<boolean>;
  events: {
    ready: {
      on: (callback: () => void) => void;
    };
    play: {
      on: (callback: () => void) => void;
    };
    pause: {
      on: (callback: () => void) => void;
    };
    ended: {
      on: (callback: () => void) => void;
    };
  };
}

// Define a type for the Mixcloud API
interface MixcloudAPI {
  PlayerWidget: (iframe: HTMLIFrameElement) => unknown;
}

/**
 * Custom hook to manage Mixcloud widget
 * @param iframeRef Reference to the iframe element
 * @param showKey Mixcloud show key
 * @param initialIsPlaying Initial playing state
 * @returns Object with widget state and controls
 */
export function useMixcloudWidget(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  showKey: string | null | undefined,
  initialIsPlaying = false
) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const widgetRef = useRef<CustomMixcloudWidget | null>(null);

  // Initialize widget when iframe is loaded
  const initWidget = useCallback(async () => {
    // Check if iframe and Mixcloud API are available
    if (!iframeRef.current || !window.Mixcloud) return;

    try {
      // Cast the widget to our custom interface
      const mixcloudApi = window.Mixcloud as MixcloudAPI;
      const widget = mixcloudApi.PlayerWidget(
        iframeRef.current
      ) as CustomMixcloudWidget;

      await widget.ready;

      // Set up event listeners
      widget.events.play.on(() => setIsPlaying(true));
      widget.events.pause.on(() => setIsPlaying(false));
      widget.events.ended.on(() => setIsPlaying(false));

      // Store widget reference
      widgetRef.current = widget;
      setIsReady(true);

      // If we should be playing, start playback
      if (initialIsPlaying) {
        widget.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error initializing Mixcloud widget:', error);
    }
  }, [iframeRef, initialIsPlaying]);

  // Play/pause control
  const togglePlayPause = async () => {
    if (!widgetRef.current) return;

    try {
      const isPaused = await widgetRef.current.getIsPaused();
      if (isPaused) {
        await widgetRef.current.play();
      } else {
        await widgetRef.current.pause();
      }
    } catch (error) {
      console.error('Error controlling Mixcloud player:', error);
      // Fallback to toggling state manually
      setIsPlaying(!isPlaying);
    }
  };

  // Play control
  const play = async () => {
    if (!widgetRef.current) return;
    try {
      await widgetRef.current.play();
    } catch (error) {
      console.error('Error playing Mixcloud:', error);
    }
  };

  // Pause control
  const pause = async () => {
    if (!widgetRef.current) return;
    try {
      await widgetRef.current.pause();
    } catch (error) {
      console.error('Error pausing Mixcloud:', error);
    }
  };

  // Initialize widget when iframe is loaded or show changes
  useEffect(() => {
    // We need to check for both the iframe and window.Mixcloud
    const checkAndInit = () => {
      if (iframeRef.current && window.Mixcloud) {
        initWidget();
      }
    };

    // Try to initialize immediately
    checkAndInit();

    // Also set up a small delay to check again, as the Mixcloud API might load after our component
    const timeoutId = setTimeout(checkAndInit, 500);

    return () => clearTimeout(timeoutId);
  }, [showKey, iframeRef, initWidget]);

  return {
    isReady,
    isPlaying,
    togglePlayPause,
    play,
    pause,
  };
}
