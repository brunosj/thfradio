import { NextResponse } from 'next/server';

// Is the live video stream on air? Asks the backend's health check and the
// HLS playlist itself at the same time; live as soon as one of them says so.
// Cached for a few seconds: every open page polls this.

const HLS_URL = 'https://video.thfradio.space/hls/live/index.m3u8';
const TIMEOUT_MS = 3000;

async function backendSaysLive(): Promise<string | null> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) return null;
  const res = await fetch(`${backendUrl}/health/stream`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.live === true ? data.hlsUrl || HLS_URL : null;
}

async function playlistIsUp(): Promise<string | null> {
  // HEAD first; GET in case HEAD isn't allowed
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(HLS_URL, { method, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return HLS_URL;
      if (res.status !== 405) return null;
    } catch {
      if (method === 'GET') return null;
    }
  }
  return null;
}

export async function GET() {
  const liveUrl = await Promise.any(
    [backendSaysLive(), playlistIsUp()].map((p) =>
      p.then((url) => url ?? Promise.reject(new Error('not live'))),
    ),
  ).catch(() => null);

  return NextResponse.json(
    { live: !!liveUrl, hlsUrl: liveUrl ?? HLS_URL },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } },
  );
}
