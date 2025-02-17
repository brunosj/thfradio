import { fetchCloudShows } from '@/lib/shows';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const shows = await fetchCloudShows();

    return NextResponse.json(shows, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in cloud shows API route:', error);
    return NextResponse.json([], { status: 500 });
  }
}
