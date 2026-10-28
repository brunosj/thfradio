import type { CloudShowTypes, ShowTypes } from '@/types/ResponsesInterface';
import { fetchMixcloudShows } from './mixcloud';
import { fetchSoundcloudShows } from './soundcloud';

type ShowsType = {
  data: ShowTypes[];
};

export async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  // Fetch Mixcloud shows first with caching
  const mixcloudShows = await fetchMixcloudShows().catch((error) => {
    console.error('Error fetching Mixcloud shows:', error);
    return [];
  });

  // Then try to fetch Soundcloud shows with caching
  let soundcloudShows: CloudShowTypes[] = [];
  try {
    // Check if SoundCloud environment variables are set
    if (
      !process.env.SOUNDCLOUD_CLIENT_ID ||
      !process.env.SOUNDCLOUD_CLIENT_SECRET ||
      !process.env.SOUNDCLOUD_USER_ID
    ) {
      console.error('SoundCloud environment variables missing');
    }

    soundcloudShows = await fetchSoundcloudShows();
  } catch (error) {
    console.error('Error fetching Soundcloud shows:', error);
  }

  const shows = [...mixcloudShows, ...soundcloudShows];

  return shows;
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
    const response = await fetch('/api/cloudShows');

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

export async function fetchProgrammeShows(locale: string): Promise<ShowTypes[]> {
  if (intranetShowsEnabled()) {
    try {
      const data = await fetchIntranet<{ shows: Partial<ShowTypes>[] }>('', locale);
      if (data?.shows) return data.shows.map(fromIntranet);
    } catch (error) {
      console.error('Intranet shows failed, falling back to old backend:', error);
    }
  }
  try {
    return await fetchBackendShows(locale);
  } catch (error) {
    console.error('Error fetching programme shows:', error);
    return [];
  }
}

export async function fetchShowBySlug(slug: string, locale: string) {
  if (intranetShowsEnabled()) {
    try {
      const data = await fetchIntranet<{ show: Partial<ShowTypes> }>(
        `/${encodeURIComponent(slug)}`,
        locale,
      );
      if (data?.show) return fromIntranet(data.show);
      // Not on the intranet (yet): the old backend may still have it.
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
