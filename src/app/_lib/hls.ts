// Shared by the live video (MiniVideoPlayer) and the archive audio
// (archiveAudio): load scripts once, and hls.js where the browser can't play
// HLS itself.

export type HlsInstance = {
  loadSource: (url: string) => void;
  attachMedia: (el: HTMLMediaElement) => void;
  on: (event: string, cb: (event: string, data: { fatal?: boolean; type?: string; details?: string }) => void) => void;
  startLoad: (startPosition?: number) => void;
  recoverMediaError: () => void;
  destroy: () => void;
};
export type HlsClass = {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
};

declare global {
  interface Window {
    Hls?: HlsClass;
  }
}

export const HLS_SCRIPT = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';

const scripts = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error(`Could not load ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

/** hls.js, loaded once. Resolves to null where it can't run (no MSE). */
export async function loadHls(): Promise<HlsClass | null> {
  await loadScript(HLS_SCRIPT);
  const Hls = window.Hls;
  return Hls?.isSupported() ? Hls : null;
}

/**
 * Safari and every iPhone/iPad browser play HLS themselves (and only that
 * works reliably there). Chrome also claims it can, but not for every
 * stream, so everyone else gets hls.js.
 */
export function playsHlsNatively(el: HTMLMediaElement): boolean {
  const ua = navigator.userAgent;
  const apple =
    /^((?!chrome|chromium|crios|android).)*safari/i.test(ua) ||
    /iP(hone|ad|od)/.test(ua) ||
    // iPadOS reports itself as a Mac
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return apple && !!el.canPlayType('application/vnd.apple.mpegurl');
}
