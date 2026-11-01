import { NextResponse } from 'next/server';
import { fetchProgrammeShows } from '@/lib/shows';

// Slug + title of every show page, for the player (cover → show page).
export const revalidate = 600;

export async function GET() {
  try {
    const shows = await fetchProgrammeShows('en');
    const list = (Array.isArray(shows) ? shows : [])
      .filter((s) => s?.slug && s?.title)
      .map((s) => ({ slug: s.slug, title: s.title }));
    return NextResponse.json(list, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('programme-shows failed:', error);
    return NextResponse.json([], { status: 200 });
  }
}
