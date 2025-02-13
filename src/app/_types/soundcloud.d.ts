declare global {
  interface Window {
    SC: {
      Widget: (iframe: HTMLIFrameElement) => {
        pause: () => void;
        play: () => void;
        bind: (event: string, callback: () => void) => void;
      };
    };
  }
}

export {};
