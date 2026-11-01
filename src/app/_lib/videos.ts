import { fetchProgrammeShows } from '@/lib/shows';
import { showMatcher } from '@/utils/guests';

// Videos for the homepage row: public YouTube videos of THF Radio.
// Which videos: the channel's public YouTube feed (the truth about what is
// public; the privacy stored in the intranet can be out of date).
// Which picture: the clean frame thfradio.space keeps per video
// (/api/public/videos?ids=…), else YouTube's thumbnail.
// If the feed can't be read, the intranet's own list of public videos is used.

export type Video = {
  youtubeId: string;
  title: string;
  airDate: string;
  youtubeUrl: string;
  image: { url: string; width: number; height: number };
  imageSource: 'photo' | 'youtube';
  showSlug: string | null;
};

const VIDEOS_URL = process.env.VIDEOS_URL || 'https://www.thfradio.space/api/public/videos';
const VIDEOS_KEY = process.env.VIDEOS_KEY || process.env.CALENDAR_2_KEY;
// THF Radio's YouTube channel (youtube.com/@THF_Radio)
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCwAP_DzbZGjyh63FNdx84UA';
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@THF_Radio';

/** "High Tempo // w/ Aezron // 14.10.26" → "High Tempo w/ Aezron" */
export const cleanVideoTitle = (title: string) =>
  title
    .replace(/\s*\/\/\s*\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/, '')
    .replace(/\s*\/\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const LIMIT = 12;

/** Air date from the "// DD.MM.YY" stamp in the title (noon UTC, safe for Berlin) */
function airDateFromTitle(title: string): string | null {
  const m = title.match(/\/\/\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*$/);
  if (!m) return null;
  const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1]), 12));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fromIntranet(ids?: string[]): Promise<Video[] | null> {
  if (!VIDEOS_KEY) return null;
  try {
    const url = new URL(VIDEOS_URL);
    if (ids?.length) url.searchParams.set('ids', ids.join(','));
    else url.searchParams.set('limit', String(LIMIT));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${VIDEOS_KEY}` },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null; // e.g. 404 until the endpoint is deployed
    const data = await res.json();
    return Array.isArray(data?.videos) ? data.videos : null;
  } catch {
    return null;
  }
}

const unescapeXml = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** The channel's public feed (latest 15 public videos). */
async function fromYouTubeFeed(): Promise<Video[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, LIMIT).flatMap(([, e]) => {
      const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      if (!id) return [];
      const title = unescapeXml(e.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
      return [
        {
          youtubeId: id,
          title: cleanVideoTitle(title),
          // the air date in the title beats the upload date
          airDate: airDateFromTitle(title) ?? e.match(/<published>([^<]+)<\/published>/)?.[1] ?? new Date().toISOString(),
          youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          image: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 480, height: 360 },
          imageSource: 'youtube' as const,
          showSlug: null,
        },
      ];
    });
  } catch {
    return [];
  }
}

/** Show pages for videos without one (feed fallback), by title like the timetable. */
async function linkShows(videos: Video[]): Promise<Video[]> {
  if (!videos.some((v) => !v.showSlug)) return videos;
  try {
    const shows = await fetchProgrammeShows('en');
    const match = showMatcher(Array.isArray(shows) ? shows : []);
    return videos.map((v) => (v.showSlug ? v : { ...v, showSlug: match(v.title) }));
  } catch {
    return videos;
  }
}

/** Never throws; no videos means the row is left out. */
export async function fetchVideos(): Promise<Video[]> {
  const feed = await fromYouTubeFeed();
  let list: Video[];
  if (feed.length) {
    // Clean frames (and show links) from the intranet for exactly these videos
    const frames = new Map((await fromIntranet(feed.map((v) => v.youtubeId)))?.map((v) => [v.youtubeId, v]) ?? []);
    list = feed.map((v) => {
      const f = frames.get(v.youtubeId);
      return f && f.imageSource === 'photo'
        ? { ...v, image: f.image, imageSource: 'photo' as const, showSlug: f.showSlug ?? v.showSlug }
        : v;
    });
  } else {
    list = (await fromIntranet()) ?? [];
  }
  const videos = await linkShows(list.map((v) => ({ ...v, title: cleanVideoTitle(v.title) })));
  if (!videos.length && process.env.NODE_ENV === 'development') return sampleVideos();
  return videos;
}

// Local preview only (no public videos yet): placeholder tiles, never played.
function sampleVideos(): Video[] {
  const day = 24 * 60 * 60 * 1000;
  return ['Live at Tempelhof w/ Mira', 'Feuerwache Session', 'THF Presents: Nachtflug', 'Studio Session w/ Juno', 'Hangar Bass Live', 'Morning Static Live'].map(
    (title, i) => ({
      youtubeId: `sample-${i}`,
      title,
      airDate: new Date(Date.now() - (i + 1) * 5 * day).toISOString(),
      youtubeUrl: YOUTUBE_CHANNEL_URL,
      image: { url: `https://picsum.photos/seed/thf-video-${i}/960/540`, width: 960, height: 540 },
      imageSource: 'photo',
      showSlug: null,
    }),
  );
}
