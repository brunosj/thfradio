import { NextResponse } from 'next/server';
import { getTrackInfo, isTrackId } from '@/lib/soundcloudStreams';

// Title, cover, link and length of one SoundCloud track, for the player bar
// when the track isn't in our archive list (e.g. some picks).
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTrackId(id)) return NextResponse.json({ error: 'Bad track id' }, { status: 400 });
  try {
    const info = await getTrackInfo(id);
    return NextResponse.json(info, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error(`soundcloud-stream info ${id}:`, error);
    return NextResponse.json({ error: 'Not available' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
