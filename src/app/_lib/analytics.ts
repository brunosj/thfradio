// Website analytics: Umami, self-hosted by THF Radio on our streaming server (no cookies,
// nothing stored in the browser, no third parties). Page views are counted by the script on
// its own; the events below are what people click. The intranet shows them under
// Streaming → Overview → Website — keep the names in sync with lib/website-events.ts there.

export const UMAMI_SCRIPT = 'https://video.thfradio.space/p/script.js';
export const UMAMI_RECORDER = 'https://video.thfradio.space/p/recorder.js';
export const UMAMI_WEBSITE_ID = '409c8ddd-54ad-4e03-bb2a-e1e468a7849f';
export const UMAMI_DOMAINS = ['thfradio.de', 'www.thfradio.de'];

export const EVENTS = {
  playLive: (channel: 1 | 2) => `play-live-ch${channel}`,
  playArchive: 'play-archive',
  playMixcloud: 'play-mixcloud',
  playPick: 'play-pick',
  unmuteVideo: 'unmute-video',
  fullscreenVideo: 'fullscreen-video',
  openChat: 'open-chat',
  openSchedule: 'open-schedule',
  switchLanguage: 'switch-language',
  /** link to another site, e.g. "out: instagram.com" */
  outbound: (host: string) => `out: ${host}`,
} as const;

type UmamiWindow = Window & { umami?: { track: (event: string, data?: Record<string, string | number>) => void } };

/** Count a click. Silently does nothing until the script has loaded (or when it is blocked). */
export function track(event: string, data?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  try {
    (window as UmamiWindow).umami?.track(event, data);
  } catch {
    // analytics must never break the page
  }
}
