import { useCallback } from 'react';
import type { LiveChannelId } from '@/app/_lib/liveChannels';
import {
  pauseLiveStream,
  playLiveStream,
  toggleLiveStream,
} from '@/app/_lib/liveStreamAudio';
import { useGlobalStore } from './useStore';

export default function useLiveStreamPlayer() {
  const liveStreamPlaying = useGlobalStore((state) => state.liveStreamPlaying);
  const activeStreamChannel = useGlobalStore(
    (state) => state.activeStreamChannel,
  );

  const play = useCallback(async (channelId: LiveChannelId) => {
    await playLiveStream(channelId);
  }, []);

  const pause = useCallback(async () => {
    await pauseLiveStream();
  }, []);

  const toggle = useCallback(async (channelId: LiveChannelId) => {
    await toggleLiveStream(channelId);
  }, []);

  return {
    isPlaying: liveStreamPlaying,
    activeStreamChannel,
    play,
    pause,
    toggle,
  };
}
