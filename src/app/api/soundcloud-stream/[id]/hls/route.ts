import { NextResponse } from 'next/server';
import { getTrackPlaylist, isTrackId } from '@/lib/soundcloudStreams';

// HLS playlist of one SoundCloud track for the archive player (lib/archiveAudio).
// ?fresh=1 skips our cache (the player asks for that when old links expired).
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTrackId(id)) return new NextResponse('Bad track id', { status: 400 });
  const fresh = new URL(request.url).searchParams.has('fresh');
  try {
    const body = await getTrackPlaylist(id, fresh);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'private, max-age=600',
      },
    });
  } catch (error) {
    console.error(`soundcloud-stream ${id}:`, error);
    return new NextResponse('Stream not available', {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
