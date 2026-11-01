// Mixcloud Widget API (https://www.mixcloud.com/developers/widget/)
type MixcloudEvent<T extends unknown[] = []> = {
  on: (cb: (...args: T) => void) => void;
  off: (cb: (...args: T) => void) => void;
};

export type MixcloudWidget = {
  ready: Promise<void>;
  pause: () => Promise<void> | void;
  play: () => Promise<void>;
  togglePlay: () => Promise<void>;
  /** seconds */
  seek: (seconds: number) => Promise<boolean | void>;
  getDuration: () => Promise<number>;
  events: {
    /** position, duration in seconds */
    progress: MixcloudEvent<[number, number]>;
    play: MixcloudEvent;
    pause: MixcloudEvent;
    ended: MixcloudEvent;
  };
};

declare global {
  interface Window {
    Mixcloud: {
      PlayerWidget: (iframe: HTMLIFrameElement) => MixcloudWidget;
    };
  }
}

export {};

export declare function PlayerWidget(
  target: HTMLIFrameElement
): PlayerWidgetReturnType;

export interface PlayerWidgetReturnType {
  events: {
    buffering: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
    ended: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
    error: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
    pause: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
    play: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
    progress: {
      on: (e: unknown) => void;
      off: (e: unknown) => void;
    };
  };
  load: (cloudcastKey: string, startPlaying: boolean) => Promise<unknown>;
  getCurrentKey: () => Promise<string>;
  getDuration: () => Promise<number>;
  getIsPaused: () => Promise<boolean>;
  getPosition: () => Promise<number>;
  getVolume: () => Promise<number>;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  ready: Promise<void>;
}
