import type { CloudShowTypes, ShowTypes } from '@/types/ResponsesInterface';
import { fetchMixcloudShows } from './mixcloud';
// import { fetchSoundcloudShows } from './soundcloud';

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
  const soundcloudShows: CloudShowTypes[] = [];
  // let soundcloudShows: CloudShowTypes[] = [];
  // try {
  //   soundcloudShows = await fetchSoundcloudShows();
  // } catch (error) {
  //   console.error('Error fetching Soundcloud shows:', error);
  // }

  const shows = [...mixcloudShows, ...soundcloudShows];

  console.log('Shows fetched:', {
    mixcloud: mixcloudShows.length,
    soundcloud: soundcloudShows.length,
    total: shows.length,
  });

  return shows;
}

// Add a new cached version of the function
export async function fetchCloudShowsCached(): Promise<CloudShowTypes[]> {
  try {
    // Use Next.js cache instead of localStorage
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/cloudShows`,
      {
        next: {
          revalidate: 43200, // 12 hours to match API route
        },
        // Add cache headers to ensure proper caching
        cache: 'force-cache',
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const shows = await response.json();
    return Array.isArray(shows) ? shows : [];
  } catch (error) {
    console.error('Error fetching cloud shows:', error);
    // In case of errors, return empty array
    return [];
  }
}

export async function fetchProgrammeShows(locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&populate=*`
  );
  const data: ShowsType = await response.json();
  return data.data;
}

export async function fetchShowBySlug(slug: string, locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`
  );
  const data: ShowsType = await response.json();
  return data.data[0];
}
