import { create } from 'zustand';

export enum ActivePlayer {
  MIXCLOUD,
  SOUNDCLOUD,
  AIRTIME,
}

interface GlobalStore {
  activePlayer: ActivePlayer | undefined;
  activePlayerSet: (activePlayer: ActivePlayer) => void;

  showKey: string | undefined;
  showKeySet: (showKey: string) => void;

  trackId: string | undefined;
  trackIdSet: (trackId: string) => void;

  currentShowUrl: string | undefined;
  setCurrentShowUrl: (url: string) => void;
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  activePlayer: undefined,
  activePlayerSet: (activePlayer) => set({ activePlayer }),

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
}));
