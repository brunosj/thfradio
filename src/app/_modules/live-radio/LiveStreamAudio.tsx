'use client';

import { useEffect, useRef } from 'react';
import {
  bindLiveStreamAudioEvents,
  pauseLiveStreamIfOtherPlayerActive,
  registerLiveStreamElements,
} from '@/app/_lib/liveStreamAudio';
import { useGlobalStore } from '@/hooks/useStore';

/** Persistent audio element — mounted above [locale] so playback survives locale switches. */
export default function LiveStreamAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const activePlayer = useGlobalStore((state) => state.activePlayer);

  useEffect(() => {
    const audio = audioRef.current;
    const source = sourceRef.current;
    if (!audio || !source) return;

    registerLiveStreamElements(audio, source);
    return bindLiveStreamAudioEvents(audio);
  }, []);

  useEffect(() => {
    pauseLiveStreamIfOtherPlayerActive();
  }, [activePlayer]);

  return (
    <audio hidden id='thfradio-live-player' preload='none' ref={audioRef}>
      <source ref={sourceRef} type='audio/mpeg' />
    </audio>
  );
}
