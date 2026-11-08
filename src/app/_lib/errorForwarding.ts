// Error reports for thfradio.space: browser errors (sent to our own /api/report-error) and
// server errors (src/instrumentation.ts) are cleaned up here and forwarded to the intranet's
// error log (POST /api/public/website-errors), where they show up in the daily error mail.
//
// Server-only: it reads INTRANET_API_KEY, which must never reach the browser.
// Reporting must never break or slow the site, so everything here swallows its own failures,
// including the intranet being unreachable or not knowing the endpoint (404).

export type ErrorKind = 'client' | 'server';

export type ErrorReport = {
  kind: ErrorKind;
  message: string;
  stack?: string;
  /** page path without query string, e.g. /de/shows/xyz */
  path: string;
  /** API route or component, e.g. /api/cloudShows */
  route?: string;
  /** Next.js error digest */
  digest?: string;
  userAgent?: string;
  /** git commit the site was built from */
  release?: string;
  occurredAt?: string;
};

const DEFAULT_BASE = 'https://thfradio.space';
const ENDPOINT = '/api/public/website-errors';
const TIMEOUT_MS = 5000;

const LIMITS = {
  message: 500,
  stack: 4000,
  path: 300,
  route: 200,
  digest: 100,
  userAgent: 200,
  release: 64,
};

// The same error (kind + where + message) is sent at most once a minute; the intranet drops
// repeats within 60 s anyway, so this only saves requests during an error storm.
const REPEAT_WINDOW_MS = 60_000;
// Upper bound for everything this server process forwards per minute (all visitors together).
const MAX_PER_MINUTE = 60;
// The intranet takes up to 20 per request and 64 KB per body; 10 cleaned reports stay well below.
const MAX_PER_REQUEST = 10;

const lastSent = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

/** Trimmed string cut to `max` characters, or undefined when empty / not a string. */
function cut(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Removes things that don't belong in an error log: query strings and #hashes of URLs and paths
 * (they can carry tokens or API keys), bearer tokens and e-mail addresses.
 * A trailing :line:column of a stack frame is kept.
 */
export function scrub(text: string): string {
  return text
    .replace(/((?:https?:\/\/|\/)[^\s?#'"`()<>]*)([?#][^\s'"`()<>]*)/g, (_, base: string, rest: string) => {
      const position = /:\d+(?::\d+)?$/.exec(rest);
      return base + (position ? position[0] : '');
    })
    .replace(/\bBearer\s+[\w.~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi, '[email]');
}

/** Only the path of a page URL: no origin, no query string, no hash. */
function cleanPath(value: unknown): string {
  let path = typeof value === 'string' ? value.trim() : '';
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      path = '';
    }
  }
  path = path.split(/[?#]/)[0];
  if (!path.startsWith('/')) return '/';
  return cut(path, LIMITS.path) || '/';
}

/** The browser's clock can be off: anything unparseable, in the future or older than a day becomes "now". */
function cleanTime(value: unknown): string {
  const now = Date.now();
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(time) || time > now + 5 * 60_000 || time < now - 24 * 60 * 60_000) {
    return new Date(now).toISOString();
  }
  return new Date(time).toISOString();
}

/**
 * Turns one untrusted report (from a browser or a server hook) into the shape the intranet
 * expects, with every field checked, cut to length and scrubbed. Null when there is no message.
 * `kind` and `userAgent` are set by the caller, never taken from the report itself.
 */
export function cleanReport(
  raw: unknown,
  fixed: { kind: ErrorKind; userAgent?: string | null },
): ErrorReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const message = cut(typeof r.message === 'string' ? scrub(r.message) : undefined, LIMITS.message);
  if (!message) return null;
  const route = cut(r.route, LIMITS.route);
  return {
    kind: fixed.kind,
    message,
    stack: cut(typeof r.stack === 'string' ? scrub(r.stack) : undefined, LIMITS.stack),
    path: cleanPath(r.path),
    route: route ? scrub(route) : undefined,
    digest: cut(r.digest, LIMITS.digest),
    userAgent: cut(fixed.userAgent, LIMITS.userAgent),
    release: cut(r.release, LIMITS.release) || cut(process.env.NEXT_PUBLIC_RELEASE, LIMITS.release),
    occurredAt: cleanTime(r.occurredAt),
  };
}

/** Same error = same kind, place and message (numbers ignored, e.g. chunk ids). */
function signature(report: ErrorReport): string {
  return `${report.kind}|${report.route || report.path}|${report.message.replace(/\d+/g, '#')}`;
}

/** False when this error was sent a moment ago or the per-minute budget is used up. */
function takeSlot(report: ErrorReport, now: number): boolean {
  const key = signature(report);
  const last = lastSent.get(key);
  if (last !== undefined && now - last < REPEAT_WINDOW_MS) return false;
  if (now - windowStart >= 60_000) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= MAX_PER_MINUTE) return false;
  sentInWindow += 1;
  if (lastSent.size > 500) {
    for (const [k, t] of lastSent) if (now - t >= REPEAT_WINDOW_MS) lastSent.delete(k);
  }
  lastSent.set(key, now);
  return true;
}

const noted = new Set<string>();

/** Why a report was not delivered: every time in development, once per reason in production. */
function note(reason: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[error reports] ${reason}`);
  } else if (!noted.has(reason)) {
    noted.add(reason);
    console.warn(`[error reports] ${reason} (logged once)`);
  }
}

/** Sends cleaned reports to thfradio.space. Never throws, never retries. */
export async function forwardErrors(reports: ErrorReport[]): Promise<void> {
  try {
    const now = Date.now();
    const fresh = reports.filter((report) => takeSlot(report, now)).slice(0, MAX_PER_REQUEST);
    if (!fresh.length) return;
    const key = process.env.INTRANET_API_KEY || process.env.CALENDAR_2_KEY;
    if (!key) return note('not sent: no INTRANET_API_KEY / CALENDAR_2_KEY');
    const base = (process.env.INTRANET_API_URL || DEFAULT_BASE).replace(/\/+$/, '');
    const res = await fetch(`${base}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ errors: fresh }),
      cache: 'no-store',
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
    if (!res.ok) note(`not accepted: HTTP ${res.status}`);
  } catch (err) {
    note(`not sent: ${err instanceof Error ? err.name : 'error'}`);
  }
}

// Next.js uses thrown errors for redirects, 404s and rendering decisions; those are not bugs.
const CONTROL_FLOW_DIGEST =
  /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|BAILOUT_TO_CLIENT_SIDE_RENDERING|DYNAMIC_SERVER_USAGE)/;

/** "TypeError: fetch failed (getaddrinfo ENOTFOUND …)": the error's type, message and cause. */
function describe(error: unknown): { message: string; stack?: string } {
  if (!(error instanceof Error)) return { message: String(error) };
  let message = error.message || error.name;
  if (error.name && error.name !== 'Error') message = `${error.name}: ${message}`;
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message) message += ` (${cause.message})`;
  return { message, stack: error.stack };
}

/** For instrumentation.ts `onRequestError`: an uncaught error in a page or API route. */
export function reportServerError(
  error: unknown,
  request: { path: string; headers: Record<string, string | string[] | undefined> },
  context: { routePath: string },
): void {
  try {
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest === 'string' && CONTROL_FLOW_DIGEST.test(digest)) return;
    // The visitor left before the page was done: nothing broke
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'ResponseAborted')) return;
    const ua = request.headers['user-agent'];
    const report = cleanReport(
      { ...describe(error), path: request.path, route: context.routePath, digest },
      { kind: 'server', userAgent: Array.isArray(ua) ? ua[0] : ua },
    );
    if (report) void forwardErrors([report]);
  } catch {
    // reporting must never add a second error
  }
}
