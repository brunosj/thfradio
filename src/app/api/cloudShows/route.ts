import { gzipSync } from 'zlib';
import { NextResponse } from 'next/server';
import { getCloudShows } from '@/lib/cloudShowsCache';
import type { CloudShowTypes } from '@/types/ResponsesInterface';

// Served from the server-side archive cache (see lib/cloudShowsCache.ts),
// not prerendered at build time: a SoundCloud hiccup during a deploy used to
// freeze an archive without SoundCloud for 12 hours.
export const dynamic = 'force-dynamic';

// Thousands of recordings, and API answers aren't compressed on the way out:
// gzip the list once each time it changes (≈ 1/8 of the size).
let packed: { shows: CloudShowTypes[]; json: string; gzip: Uint8Array } | null = null;
function pack(shows: CloudShowTypes[]) {
  if (packed?.shows !== shows) {
    const json = JSON.stringify(shows);
    packed = { shows, json, gzip: new Uint8Array(gzipSync(json)) };
  }
  return packed;
}

export async function GET(request: Request) {
  try {
    const { json, gzip } = pack(await getCloudShows());
    const zipped = /\bgzip\b/.test(request.headers.get('accept-encoding') ?? '');
    return new NextResponse(zipped ? gzip : json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(zipped ? { 'Content-Encoding': 'gzip' } : {}),
        Vary: 'Accept-Encoding',
        // Not cached locally, so changes show right away
        'Cache-Control':
          process.env.NODE_ENV === 'development'
            ? 'no-store'
            : 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error in cloud shows API route:', error);
    // Return empty array with 200 status to not break UI; not cached
    return NextResponse.json(
      {
        shows: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
