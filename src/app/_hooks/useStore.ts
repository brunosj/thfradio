import { create } from 'zustand';
import type { LiveChannelId } from '@/app/_lib/liveChannels';

export enum ActivePlayer {
  MIXCLOUD,
  SOUNDCLOUD,
  AIRTIME,
}

interface GlobalStore {
  activePlayer: ActivePlayer | undefined;
  activePlayerSet: (activePlayer: ActivePlayer) => void;

  /** Live audio stream (LiveTicker + mobile header player) */
  activeStreamChannel: LiveChannelId;
  setActiveStreamChannel: (channel: LiveChannelId) => void;

  liveStreamPlaying: boolean;
  setLiveStreamPlaying: (playing: boolean) => void;

  /** Timetable grid view only */
  activeTimetableChannel: LiveChannelId;
  setActiveTimetableChannel: (channel: LiveChannelId) => void;

  showKey: string | undefined;
  showKeySet: (showKey: string) => void;

  trackId: string | undefined;
  trackIdSet: (trackId: string) => void;

  currentShowUrl: string | undefined;
  setCurrentShowUrl: (url: string) => void;

  resetPlayer: () => void;
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  activePlayer: undefined,
  activePlayerSet: (activePlayer) => set({ activePlayer }),

  activeStreamChannel: 1,
  setActiveStreamChannel: (channel) => set({ activeStreamChannel: channel }),

  liveStreamPlaying: false,
  setLiveStreamPlaying: (playing) => set({ liveStreamPlaying: playing }),

  activeTimetableChannel: 1,
  setActiveTimetableChannel: (channel) => set({ activeTimetableChannel: channel }),

  showKey: undefined,
  showKeySet: (showKey) =>
    set({
      activePlayer: ActivePlayer.MIXCLOUD,
      showKey,
    }),

  trackId: undefined,
  trackIdSet: (trackId) =>
    set({
      activePlayer: ActivePlayer.SOUNDCLOUD,
      trackId,
    }),

  currentShowUrl: undefined,
  setCurrentShowUrl: (url) => set({ currentShowUrl: url }),

  resetPlayer: () =>
    set({
      activePlayer: undefined,
      showKey: undefined,
      trackId: undefined,
    }),
}));
