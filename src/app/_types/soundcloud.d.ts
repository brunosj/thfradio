// SoundCloud Widget API (https://developers.soundcloud.com/docs/api/html5-widget)
export type SoundcloudSound = {
  title?: string;
  artwork_url?: string | null;
  permalink_url?: string;
  duration?: number;
  user?: { username?: string };
};

export type SoundcloudWidget = {
  pause: () => void;
  play: () => void;
  toggle: () => void;
  /** milliseconds */
  seekTo: (ms: number) => void;
  bind: (event: string, callback: (e?: { currentPosition?: number; relativePosition?: number }) => void) => void;
  unbind: (event: string) => void;
  getDuration: (callback: (ms: number) => void) => void;
  getCurrentSound: (callback: (sound: SoundcloudSound | null) => void) => void;
};

declare global {
  interface Window {
    SC: {
      Widget: (iframe: HTMLIFrameElement) => SoundcloudWidget;
    };
  }
}

export {};
