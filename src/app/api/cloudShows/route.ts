import { fetchCloudShows } from '@/lib/shows';
import { NextResponse } from 'next/server';

// Set to 12 hours for better caching
export const revalidate = 43200; // 12 hours in seconds

export async function GET() {
  try {
    const shows = await fetchCloudShows();

    return NextResponse.json(shows, {
      status: 200,
      headers: {
        // Longer cache times with stale-while-revalidate approach
        'Cache-Control': 'public, max-age=43200, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error in cloud shows API route:', error);
    // Return empty array with 200 status to not break UI
    return NextResponse.json(
      {
        shows: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
      }
    );
  }
}
