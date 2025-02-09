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
