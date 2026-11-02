// Server only: what the archive player needs from SoundCloud for one track.
// SoundCloud no longer offers plain mp3 files, only HLS (playlist + short
// segments). We hand out the playlist from our own domain; its segment links
// point at SoundCloud's CDN (open to every site) and stay valid ~3.5 hours.
import { soundcloudFetch } from './soundcloud';

const API = 'https://api.soundcloud.com';
/** Playlist links last ~3.5 h; reuse one for an hour, then fetch a fresh one. */
const PLAYLIST_TTL_MS = 60 * 60 * 1000;
const INFO_TTL_MS = 12 * 60 * 60 * 1000;

export const isTrackId = (id: string) => /^\d{1,20}$/.test(id);

const playlists = new Map<string, { body: string; expires: number }>();
const infos = new Map<string, { info: TrackInfo; expires: number }>();

export interface TrackInfo {
  title: string;
  artwork: string | null;
  permalink: string | null;
  /** seconds */
  duration: number | null;
}

function remember<T>(map: Map<string, T>, key: string, value: T) {
  // Keep memory small: drop the oldest entries past 500
  if (map.size >= 500) map.delete(map.keys().next().value as string);
  map.set(key, value);
}

/** The track's HLS playlist (AAC 160, else MP3 128). Throws when there is none. */
export async function getTrackPlaylist(id: string, fresh = false): Promise<string> {
  const cached = playlists.get(id);
  if (!fresh && cached && cached.expires > Date.now()) return cached.body;

  const res = await soundcloudFetch(`${API}/tracks/${id}/streams`);
  if (!res.ok) throw new Error(`SoundCloud streams ${res.status}`);
  const streams = (await res.json()) as Record<string, string | undefined>;

  for (const key of ['hls_aac_160_url', 'hls_mp3_128_url']) {
    const url = streams[key];
    if (!url) continue;
    // The API answers with a redirect to the signed playlist on the CDN
    const redirect = await soundcloudFetch(url, { redirect: 'manual' });
    const location = redirect.headers.get('location');
    const playlistUrl = location ?? (redirect.ok ? url : null);
    if (!playlistUrl) continue;
    const playlist = location ? await fetch(location, { cache: 'no-store' }) : redirect;
    if (!playlist.ok) continue;
    const body = await playlist.text();
    if (!body.startsWith('#EXTM3U')) continue;
    remember(playlists, id, { body, expires: Date.now() + PLAYLIST_TTL_MS });
    return body;
  }
  throw new Error('No playable stream for this track');
}

/** Title, cover, link and length of a track (for tracks not in our archive list). */
export async function getTrackInfo(id: string): Promise<TrackInfo> {
  const cached = infos.get(id);
  if (cached && cached.expires > Date.now()) return cached.info;
  const res = await soundcloudFetch(`${API}/tracks/${id}`);
  if (!res.ok) throw new Error(`SoundCloud track ${res.status}`);
  const t = (await res.json()) as {
    title?: string;
    artwork_url?: string | null;
    permalink_url?: string | null;
    duration?: number | null;
  };
  const info: TrackInfo = {
    title: t.title ?? '',
    artwork: t.artwork_url ? t.artwork_url.replace('-large', '-t500x500') : null,
    permalink: t.permalink_url ? t.permalink_url.split('?')[0] : null,
    duration: t.duration ? Math.round(t.duration / 1000) : null,
  };
  remember(infos, id, { info, expires: Date.now() + INFO_TTL_MS });
  return info;
}
