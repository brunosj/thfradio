import { fetchCloudShows } from '@/lib/shows';
import { NextResponse } from 'next/server';

export const revalidate = 86400; // 24 hours in seconds

export async function GET() {
  try {
    const shows = await fetchCloudShows();

    return NextResponse.json(shows, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    console.error('Error in cloud shows API route:', error);
    return NextResponse.json([], { status: 500 });
  }
}
