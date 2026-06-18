import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { LiveChannelId } from '@/app/_lib/liveChannels';
import { ActivePlayer, useGlobalStore } from './useStore';

export default function usePlayerState({
  audioRef,
  sourceRef,
  url,
  channelId,
}: {
  audioRef: MutableRefObject<HTMLAudioElement>;
  sourceRef: MutableRefObject<HTMLSourceElement>;
  url: string;
  channelId?: LiveChannelId;
}) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const previousUrlRef = useRef(url);
  const playInProgressRef = useRef(false);

  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const activePlayerSet = useGlobalStore((state) => state.activePlayerSet);
  const activeStreamChannel = useGlobalStore(
    (state) => state.activeStreamChannel,
  );
  const setActiveStreamChannel = useGlobalStore(
    (state) => state.setActiveStreamChannel,
  );
  const previousActiveChannelRef = useRef(activeStreamChannel);

  useEffect(() => {
    const audio = audioRef?.current;
    const setStatePlaying = () => setIsPlaying(true);
    const setStatePaused = () => setIsPlaying(false);

    audio?.addEventListener('play', setStatePlaying);
    audio?.addEventListener('pause', setStatePaused);

    return () => {
      audio?.removeEventListener('play', setStatePlaying);
      audio?.removeEventListener('pause', setStatePaused);
    };
  }, [audioRef]);

  const pause = useCallback(async () => {
    try {
      setIsPlaying(false);
      // Clear src so the next play reconnects to the live stream endpoint.
      sourceRef?.current?.setAttribute('src', '');
      audioRef?.current?.pause();
    } catch (error) {
      setIsPlaying(false);
      console.error(error);
    }
  }, [audioRef, sourceRef]);

  useEffect(() => {
    if (previousUrlRef.current !== url) {
      previousUrlRef.current = url;
      void pause();
    }
  }, [url, pause]);

  const play = useCallback(async () => {
    if (channelId !== undefined) {
      setActiveStreamChannel(channelId);
    }

    playInProgressRef.current = true;

    try {
      activePlayerSet(ActivePlayer.AIRTIME);

      const currentSrc = sourceRef?.current?.getAttribute('src');
      if (currentSrc !== url) {
        sourceRef?.current?.setAttribute('src', url);
      }

      await audioRef?.current?.load();
      await audioRef?.current?.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setIsPlaying(false);
      console.error(error);
    } finally {
      playInProgressRef.current = false;
    }
  }, [
    audioRef,
    activePlayerSet,
    url,
    sourceRef,
    channelId,
    setActiveStreamChannel,
  ]);

  useEffect(() => {
    if (
      activePlayer === ActivePlayer.MIXCLOUD ||
      activePlayer === ActivePlayer.SOUNDCLOUD
    ) {
      void pause();
    }
  }, [activePlayer, pause]);

  useEffect(() => {
    const previousChannel = previousActiveChannelRef.current;
    previousActiveChannelRef.current = activeStreamChannel;

    if (
      channelId === undefined ||
      playInProgressRef.current ||
      previousChannel === activeStreamChannel ||
      activeStreamChannel === channelId
    ) {
      return;
    }

    void pause();
  }, [activeStreamChannel, channelId, pause]);

  return {
    isPlaying,
    play,
    pause,
  };
}
