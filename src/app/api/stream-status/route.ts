import { NextResponse } from 'next/server';

const HLS_URL = 'https://video.thfradio.space/hls/live/index.m3u8';

async function checkHlsStream(): Promise<boolean> {
  try {
    const response = await fetch(HLS_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    // Try GET as fallback in case HEAD is not allowed
    try {
      const response = await fetch(HLS_URL, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export async function GET() {
  const hlsUrl = HLS_URL;

  // Try backend health endpoint first
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/health/stream`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.live === true) {
          return NextResponse.json({
            live: true,
            hlsUrl: data.hlsUrl || hlsUrl,
          });
        }
      }
    } catch {
      // Backend unreachable, fall through to direct HLS check
    }
  }

  // Fallback: check the HLS stream directly
  const isLive = await checkHlsStream();
  return NextResponse.json({ live: isLive, hlsUrl });
}
