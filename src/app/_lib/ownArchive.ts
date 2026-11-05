// The old Mixcloud shows (2019–2025), served from THF Radio's own server.
//
// thfradio.space copied every Mixcloud upload onto its storage and lists them
// at /api/public/archive (docs: THF_Space docs/ARCHIVE_API.md). The audio is a
// plain .m4a / .mp3 file that seeks by itself, so these shows play in the
// site's own player (lib/archiveAudio) instead of Mixcloud's widget.
// A show taken down on thfradio.space disappears from this list, and its file
// stops answering at once.
//
//   ARCHIVE_SOURCE=own        (default) our own files, Mixcloud's API only if
//                             thfradio.space can't be reached
//   ARCHIVE_SOURCE=mixcloud   back to Mixcloud's API + widget (no deploy needed)
import type { CloudShowTypes } from '@/types/ResponsesInterface';

type ArchiveItem = {
  slug: string;
  title: string;
  airDate: string; // YYYY-MM-DD
  durationSec: number;
  genres: string[];
  audioUrl: string;
  coverUrl: string | null;
  mixcloudUrl: string;
};

type ArchivePage = { items?: ArchiveItem[]; total?: number };

const PAGE_SIZE = 100;
const PARALLEL = 5;

export function ownArchiveEnabled() {
  return process.env.ARCHIVE_SOURCE !== 'mixcloud' && Boolean(process.env.INTRANET_API_KEY || process.env.CALENDAR_2_KEY);
}

function toCloudShow(item: ArchiveItem): CloudShowTypes {
  const picture = item.coverUrl || '';
  return {
    id: `archive:${item.slug}`,
    name: item.title,
    url: item.mixcloudUrl,
    key: item.audioUrl,
    platform: 'archive',
    picture,
    pictures: { extra_large: picture },
    tags: item.genres.map((g) => ({ key: g.toLowerCase(), name: g, url: `tag/${g.toLowerCase().replace(/\s+/g, '-')}` })),
    genres: item.genres,
    durationSec: item.durationSec || null,
    // Noon, so the day is the same in every time zone
    date: `${item.airDate}T12:00:00.000Z`,
  };
}

async function fetchPage(base: string, key: string, page: number): Promise<ArchivePage> {
  const res = await fetch(`${base}/api/public/archive?limit=${PAGE_SIZE}&page=${page}&sort=new`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`archive page ${page}: ${res.status}`);
  return (await res.json()) as ArchivePage;
}

/**
 * Every show of the own archive. `complete` is false when a page couldn't be
 * read, so a short list never replaces a good one (lib/cloudShowsCache).
 */
export async function fetchOwnArchiveShows(): Promise<{ shows: CloudShowTypes[]; complete: boolean }> {
  const base = (process.env.INTRANET_API_URL || 'https://www.thfradio.space').replace(/\/$/, '');
  const key = (process.env.INTRANET_API_KEY || process.env.CALENDAR_2_KEY)!;

  const first = await fetchPage(base, key, 1);
  const total = first.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const items: ArchiveItem[] = [...(first.items ?? [])];
  let complete = true;

  const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2);
  for (let i = 0; i < rest.length; i += PARALLEL) {
    const batch = await Promise.allSettled(rest.slice(i, i + PARALLEL).map((p) => fetchPage(base, key, p)));
    for (const r of batch) {
      if (r.status === 'fulfilled') items.push(...(r.value.items ?? []));
      else {
        complete = false;
        console.error('Own archive:', r.reason);
      }
    }
  }
  // A show taken down while we paged would shift the pages: fine, the next
  // refresh is complete. Duplicates from that shift are dropped here.
  const seen = new Set<string>();
  const shows = items.filter((it) => it.audioUrl && !seen.has(it.slug) && seen.add(it.slug)).map(toCloudShow);
  if (shows.length < total * 0.98) complete = false;
  return { shows, complete };
}
