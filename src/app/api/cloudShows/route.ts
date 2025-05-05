import { fetchCloudShows } from '@/lib/shows';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // 1 hour in seconds

export async function GET() {
  try {
    const shows = await fetchCloudShows();

    return NextResponse.json(shows, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error in cloud shows API route:', error);
    return NextResponse.json([], { status: 500 });
  }
}
