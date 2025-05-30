import { MutableRefObject, useCallback, useEffect, useState } from 'react';
import { ActivePlayer, useGlobalStore } from './useStore';

export default function usePlayerState({
  audioRef,
  sourceRef,
  url,
}: {
  audioRef: MutableRefObject<HTMLAudioElement>;
  sourceRef: MutableRefObject<HTMLSourceElement>;
  url: string;
}) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const activePlayerSet = useGlobalStore((state) => state.activePlayerSet);

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

  const play = useCallback(async () => {
    try {
      setIsPlaying(true);

      activePlayerSet(ActivePlayer.AIRTIME);

      if (!sourceRef?.current?.getAttribute('src')) {
        sourceRef?.current?.setAttribute('src', url);
      }

      await audioRef?.current?.load();
      await audioRef?.current?.play();
    } catch (error) {
      setIsPlaying(false);

      console.error(error);
    }
  }, [audioRef, activePlayerSet, url, sourceRef]);

  const pause = useCallback(async () => {
    try {
      setIsPlaying(false);

      sourceRef?.current?.setAttribute('src', '');
      audioRef?.current?.pause();
    } catch (error) {
      setIsPlaying(false);

      console.error(error);
    }
  }, [audioRef, sourceRef]);

  useEffect(() => {
    if (activePlayer === ActivePlayer.MIXCLOUD) {
      pause();
    }
  }, [activePlayer, pause]);

  return {
    isPlaying,
    play,
    pause,
  };
}
