import { after, type NextRequest } from 'next/server';
import { cleanReport, forwardErrors, type ErrorReport } from '@/lib/errorForwarding';

// Browser errors from thfradio.de (src/app/_lib/reportError.ts) land here and are passed on
// to thfradio.space server-to-server, so the API key stays on the server.
// Always answers 204 straight away, whatever happens, and forwards after the response is sent.

const MAX_BODY_BYTES = 32 * 1024;
// A page sends at most 5 reports; this leaves room for a few reloads.
const PER_IP_PER_MINUTE = 10;
const MAX_PER_REQUEST = 5;

// Per-IP counters live only in this server's memory and are only used for the limit.
// The IP itself is never forwarded or stored anywhere else.
const counters = new Map<string, { count: number; resetAt: number }>();

/** How many of `wanted` reports this visitor may still send this minute. */
function allowance(ip: string, wanted: number): number {
  const now = Date.now();
  if (counters.size > 5000) {
    for (const [key, entry] of counters) if (entry.resetAt <= now) counters.delete(key);
  }
  let entry = counters.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + 60_000 };
    counters.set(ip, entry);
  }
  const allowed = Math.max(0, Math.min(wanted, PER_IP_PER_MINUTE - entry.count));
  entry.count += allowed;
  return allowed;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

const done = () => new Response(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    // Only pages of this site send reports; other sites' pages are ignored
    if (request.headers.get('sec-fetch-site') === 'cross-site') return done();
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BODY_BYTES) return done();

    // Sent as text/plain by navigator.sendBeacon, so parse it ourselves
    const text = await request.text();
    if (!text || text.length > MAX_BODY_BYTES) return done();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return done();
    }

    const list = (body as { errors?: unknown } | null)?.errors;
    const items = (Array.isArray(list) ? list : [body]).slice(0, MAX_PER_REQUEST);
    const userAgent = request.headers.get('user-agent');
    const reports = items
      .map((item) => cleanReport(item, { kind: 'client', userAgent }))
      .filter((report): report is ErrorReport => report !== null);
    if (!reports.length) return done();

    const allowed = allowance(clientIp(request), reports.length);
    if (allowed > 0) after(() => forwardErrors(reports.slice(0, allowed)));
  } catch {
    // never fail: the browser doesn't care, and a broken report must not become a new error
  }
  return done();
}
