import type { CloudShowTypes, ShowTypes } from '@/types/ResponsesInterface';
import { fetchMixcloudShows } from './mixcloud';
import { fetchSoundcloudShows } from './soundcloud';

type ShowsType = {
  data: ShowTypes[];
};

/** Letters and digits of a recording title without its "// date" part. */
const recordingKey = (name: string | undefined) =>
  (name ?? '').split('//')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Mixcloud + SoundCloud recordings. `complete` is false when SoundCloud
 * (the main archive) couldn't be read, so callers don't cache a short list.
 */
export async function fetchCloudShowsWithStatus(): Promise<{
  shows: CloudShowTypes[];
  complete: boolean;
}> {
  const [mixcloudShows, soundcloud] = await Promise.all([
    fetchMixcloudShows().catch((error) => {
      console.error('Error fetching Mixcloud shows:', error);
      return [] as CloudShowTypes[];
    }),
    fetchSoundcloudShows()
      .then((shows) => ({ shows, ok: true }))
      .catch((error) => {
        console.error('Error fetching Soundcloud shows:', error);
        return { shows: [] as CloudShowTypes[], ok: false };
      }),
  ]);

  // The same show uploaded to both: keep the SoundCloud one
  const onSoundcloud = new Set(soundcloud.shows.map((s) => recordingKey(s.name)));
  const mixcloudOnly = mixcloudShows.filter((s) => !onSoundcloud.has(recordingKey(s.name)));

  return {
    shows: [...mixcloudOnly, ...soundcloud.shows],
    complete: soundcloud.ok && soundcloud.shows.length > 0,
  };
}

export async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  return (await fetchCloudShowsWithStatus()).shows;
}

// Client-side function to fetch cloud shows from the API
// Server-side caching is handled by unstable_cache in the API route
export async function fetchCloudShowsCached(): Promise<CloudShowTypes[]> {
  try {
    // Check if we're on the server side
    const isServer = typeof window === 'undefined';

    if (isServer) {
      // On server side, call the function directly to avoid HTTP overhead
      // The API route uses unstable_cache for proper caching
      return await fetchCloudShows();
    }

    // On client side, fetch from API
    // The API route handles caching with proper cache tags
    // "?v=2": browsers kept the old 12-hour copy (15 shows) of /api/cloudShows;
    // a new address makes every browser fetch the full archive.
    const response = await fetch('/api/cloudShows?v=2');

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Handle the new response format which might include error information
    if (data.error) {
      console.error('API returned error:', data.error);
      return data.shows || [];
    }

    // Handle the original array format
    const shows = Array.isArray(data) ? data : data.shows || [];

    return shows;
  } catch (error) {
    console.error('Error fetching cloud shows:', error);
    // In case of errors, return empty array
    return [];
  }
}

// ---------------------------------------------------------------------------
// Programme shows (show list + show pages)
//
// Source of truth is thfradio.space ("Intranet"): hosts edit their show info
// there and /api/public/shows serves it. While the old backend
// (NEXT_PUBLIC_BACKEND_URL) is still running it stays as a fallback, so the
// switch can be flipped with SHOWS_SOURCE and rolled back without a deploy.
//
//   SHOWS_SOURCE=intranet    read from thfradio.space (old backend = fallback)
//   SHOWS_SOURCE=backend     old backend only (default until the switch)
//   INTRANET_API_URL         e.g. https://www.thfradio.space
//   INTRANET_API_KEY         timetable API key (falls back to CALENDAR_2_KEY)
//
// Data is cached under the "shows" tag; thfradio.space calls
// /api/revalidate with { model: "show" } when a host saves, which clears it.
// ---------------------------------------------------------------------------

export const SHOWS_CACHE_TAG = 'shows';
const SHOWS_REVALIDATE_SECONDS = 300;

function intranetShowsEnabled() {
  return (
    process.env.SHOWS_SOURCE === 'intranet' &&
    Boolean(process.env.INTRANET_API_URL) &&
    Boolean(process.env.INTRANET_API_KEY || process.env.CALENDAR_2_KEY)
  );
}

async function fetchIntranet<T>(path: string, locale: string): Promise<T | null> {
  const base = process.env.INTRANET_API_URL!.replace(/\/$/, '');
  const key = process.env.INTRANET_API_KEY || process.env.CALENDAR_2_KEY;
  const lang = locale === 'de' ? 'de' : 'en';
  const response = await fetch(`${base}/api/public/shows${path}?lang=${lang}`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: SHOWS_REVALIDATE_SECONDS, tags: [SHOWS_CACHE_TAG] },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Intranet shows API ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

/** Fill the fields the old backend had and the intranet doesn't send. */
function fromIntranet(show: Partial<ShowTypes>): ShowTypes {
  return {
    status: 'published',
    updatedAt: show.createdAt ?? '',
    djs: [],
    ...show,
    image: show.image ?? undefined,
    imageFullWidth: show.imageFullWidth ?? undefined,
  } as ShowTypes;
}

async function fetchBackendShows(locale: string): Promise<ShowTypes[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${backendUrl}/shows?lang=${locale}`, {
    next: { revalidate: SHOWS_REVALIDATE_SECONDS, tags: [SHOWS_CACHE_TAG] },
  });
  return await response.json();
}

async function fetchBackendShow(slug: string, locale: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${backendUrl}/shows/${slug}?lang=${locale}`, {
    next: { revalidate: 600, tags: [SHOWS_CACHE_TAG] },
  });
  return await response.json();
}

/** "Café Ölbaum!" → "cafeolbaum" — for matching shows across both sources. */
function normTitle(title: string | undefined): string {
  return (title ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * "Takeoff w/ Vincent Grabowski" → "takeoff": the show without its guest part
 * (and a leading "The"). The old website had some shows twice this way.
 */
function baseTitle(title: string | undefined): string {
  const key = normTitle((title ?? '').replace(/\s*\(?\s*(?:w\/|with|feat\.|ft\.)\s.*$/i, ''));
  return key.replace(/^the(?=[a-z0-9]{5})/, '');
}

/**
 * Where thfradio.space has nothing, keep what the old backend had.
 * Host-written values always win. Pictures: if thfradio.space has any
 * picture of the show, only its pictures are used.
 */
function fillFromBackend(show: ShowTypes, old: ShowTypes | undefined): ShowTypes {
  if (!old) return show;
  const hasPicture = Boolean(show.image || show.imageFullWidth);
  return {
    ...show,
    image: hasPicture ? show.image : old.image,
    imageFullWidth: hasPicture ? show.imageFullWidth : old.imageFullWidth,
    description: show.description || old.description,
    teaserSentence: show.teaserSentence || old.teaserSentence,
  };
}

/**
 * Intranet shows first, then every old-backend show that isn't on the
 * intranet (yet), so no show drops off the list during the move.
 */
function mergeShows(intranet: ShowTypes[], backend: ShowTypes[]): ShowTypes[] {
  const bySlug = new Map(backend.map((s) => [s.slug, s]));
  const byTitle = new Map(backend.map((s) => [normTitle(s.title), s]));
  const matched = new Set<ShowTypes>();

  const merged = intranet.map((show) => {
    const old = bySlug.get(show.slug) ?? byTitle.get(normTitle(show.title));
    if (old) matched.add(old);
    return fillFromBackend(show, old);
  });
  const intranetSlugs = new Set(merged.map((s) => s.slug));
  // Old double pages ("Takeoff" + "Takeoff w/ …") count as the same show
  const intranetBases = new Set(merged.map((s) => baseTitle(s.title)).filter((k) => k.length >= 3));
  const leftovers = backend.filter(
    (s) => !matched.has(s) && !intranetSlugs.has(s.slug) && !intranetBases.has(baseTitle(s.title)),
  );
  return [...merged, ...leftovers];
}

async function backendShowsOrEmpty(locale: string): Promise<ShowTypes[]> {
  try {
    const shows = await fetchBackendShows(locale);
    return Array.isArray(shows) ? shows : [];
  } catch (error) {
    console.error('Error fetching programme shows from old backend:', error);
    return [];
  }
}

export async function fetchProgrammeShows(locale: string): Promise<ShowTypes[]> {
  if (intranetShowsEnabled()) {
    const [intranet, backend] = await Promise.all([
      fetchIntranet<{ shows: Partial<ShowTypes>[] }>('', locale).catch((error) => {
        console.error('Intranet shows failed, falling back to old backend:', error);
        return null;
      }),
      backendShowsOrEmpty(locale),
    ]);
    if (intranet?.shows) return mergeShows(intranet.shows.map(fromIntranet), backend);
    return backend;
  }
  return backendShowsOrEmpty(locale);
}

export async function fetchShowBySlug(slug: string, locale: string) {
  if (intranetShowsEnabled()) {
    try {
      // Route params can arrive still URL-encoded ("fu%C3%9Findertuer"):
      // decode first so the slug is encoded exactly once.
      let plainSlug = slug;
      try {
        plainSlug = decodeURIComponent(slug);
      } catch {
        // Not valid encoding: use as is.
      }
      const data = await fetchIntranet<{ show: Partial<ShowTypes> }>(
        `/${encodeURIComponent(plainSlug)}`,
        locale,
      );
      if (data?.show) {
        const show = fromIntranet(data.show);
        if ((show.image || show.imageFullWidth) && show.description) return show;
        // Something missing on the intranet: borrow it from the old backend.
        const old = await fetchBackendShow(show.slug, locale).catch(() => null);
        return fillFromBackend(show, old?.title ? old : undefined);
      }
      // Not on the intranet (yet): the old backend may still have it. If it
      // was one of the old double pages ("… w/ Louis Largo"), show the
      // thfradio.space show of the same name instead.
      const old = await fetchBackendShow(slug, locale).catch(() => null);
      const key = baseTitle(old?.title);
      if (key.length >= 3) {
        const list = await fetchIntranet<{ shows: Partial<ShowTypes>[] }>('', locale);
        const twin = list?.shows.find((s) => s.slug && baseTitle(s.title) === key);
        if (twin?.slug) {
          const twinData = await fetchIntranet<{ show: Partial<ShowTypes> }>(
            `/${encodeURIComponent(twin.slug)}`,
            locale,
          );
          if (twinData?.show) return fillFromBackend(fromIntranet(twinData.show), old);
        }
      }
      if (old) return old;
    } catch (error) {
      console.error(`Intranet show ${slug} failed, falling back to old backend:`, error);
    }
  }
  try {
    return await fetchBackendShow(slug, locale);
  } catch (error) {
    console.error(`Error fetching show by slug ${slug}:`, error);
    return null;
  }
}
