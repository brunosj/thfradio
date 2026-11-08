// Browser side of error reporting: sends a JavaScript error of this page to our own
// /api/report-error, which passes it on to thfradio.space (see src/app/_lib/errorForwarding.ts).
// Only on thfradio.de itself (not localhost, previews or inside frames, same rule as analytics),
// at most 5 different errors per page load, and noise we can't fix is skipped.
// Never throws and never waits: a failed report is simply lost.

import { UMAMI_DOMAINS } from '@/lib/analytics';

const ENDPOINT = '/api/report-error';
const MAX_PER_PAGE = 5;

let sent = 0;
const seen = new Set<string>();

// Not bugs of this site: browser quirks, cancelled requests, being offline, autoplay rules,
// and errors from other sites' scripts that the browser hides from us.
const NOISE = [
  /ResizeObserver loop/i,
  /\bAbortError\b/,
  /\baborted\b/i,
  /^(TypeError: )?(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?|Network request failed)$/i,
  /^Script error\.?$/i,
  /\bNotAllowedError\b/,
];
const IGNORED_NAMES = new Set(['AbortError', 'NotAllowedError']);
const EXTENSION_URL = /\b(chrome|moz|safari|safari-web|ms-browser)-extension:\/\/|webkit-masked-url:/i;

function isLiveSite(): boolean {
  if (!UMAMI_DOMAINS.includes(window.location.hostname)) return false;
  try {
    return window.self === window.top;
  } catch {
    return false; // cross-origin parent: framed
  }
}

function isOwnUrl(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** A stack frame line: Chrome "at fn (url:1:2)", Firefox/Safari "fn@url:1:2". */
const isFrame = (line: string) => /^\s*at\s/.test(line) || /@\S+:\d+(:\d+)?\s*$/.test(line);

/** The script URL of the first stack frame that has one. */
function firstFrameUrl(stack: string): string | null {
  for (const line of stack.split('\n')) {
    if (!isFrame(line)) continue;
    const url = line.match(/(?:https?|blob):\/\/[^\s)]+/)?.[0];
    if (url) return url.replace(/(:\d+){1,2}$/, '');
  }
  return null;
}

function describe(error: unknown): { message: string; stack?: string; name?: string } | null {
  if (error instanceof Error) {
    const name = error.name || 'Error';
    const message = error.message ? (name === 'Error' ? error.message : `${name}: ${error.message}`) : name;
    return { message, stack: typeof error.stack === 'string' ? error.stack : undefined, name };
  }
  if (typeof error === 'string') return error ? { message: error } : null;
  // Promises rejected with nothing or with an event (e.g. a failed media load): no details to act on
  if (error === undefined || error === null || (typeof Event !== 'undefined' && error instanceof Event)) return null;
  try {
    return { message: `Non-error value: ${JSON.stringify(error).slice(0, 200)}` };
  } catch {
    return { message: `Non-error value: ${String(error)}` };
  }
}

function send(body: string) {
  try {
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  } catch {
    // fall back to fetch
  }
  fetch(ENDPOINT, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
  }).catch(() => {});
}

export type ReportOptions = {
  /** where it was caught, e.g. "[locale]/error.tsx" or "unhandledrejection" */
  route?: string;
  digest?: string;
  /** script URL from a window "error" event */
  filename?: string;
};

/** Report an error of this page. Safe to call anywhere, any number of times. */
export function reportClientError(error: unknown, options: ReportOptions = {}): void {
  try {
    if (typeof window === 'undefined' || sent >= MAX_PER_PAGE || !isLiveSite()) return;
    const info = describe(error);
    if (!info || (info.name && IGNORED_NAMES.has(info.name))) return;
    const { message, stack } = info;
    if (NOISE.some((pattern) => pattern.test(message))) return;

    // Browser extensions and other sites' scripts
    if (options.filename && (EXTENSION_URL.test(options.filename) || !isOwnUrl(options.filename))) return;
    if (stack) {
      if (EXTENSION_URL.test(stack)) return;
      const frameUrl = firstFrameUrl(stack);
      if (frameUrl && !isOwnUrl(frameUrl)) return;
    }

    // Each error only once per page load (also guards against React running effects twice)
    const firstFrame = stack?.split('\n').find(isFrame)?.trim() ?? '';
    const key = `${message}|${firstFrame}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;

    send(
      JSON.stringify({
        errors: [
          {
            kind: 'client',
            message: message.slice(0, 500),
            stack: stack?.slice(0, 4000),
            path: window.location.pathname,
            route: options.route,
            digest: options.digest,
            release: process.env.NEXT_PUBLIC_RELEASE || undefined,
            occurredAt: new Date().toISOString(),
          },
        ],
      }),
    );
  } catch {
    // reporting must never add a second error
  }
}
