import { NextResponse } from 'next/server';
import { getCloudShows } from '@/lib/cloudShowsCache';

// Served from the server-side archive cache (see lib/cloudShowsCache.ts),
// not prerendered at build time: a SoundCloud hiccup during a deploy used to
// freeze an archive without SoundCloud for 12 hours.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shows = await getCloudShows();
    return NextResponse.json(shows, {
      status: 200,
      headers: {
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
