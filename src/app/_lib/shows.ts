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
  // Try to get from localStorage cache first
  if (typeof window !== 'undefined') {
    const cachedData = localStorage.getItem('cloudShowsCache');
    const cachedTime = localStorage.getItem('cloudShowsCacheTime');

    if (cachedData && cachedTime) {
      const cacheAge = Date.now() - parseInt(cachedTime, 10);
      const ONE_HOUR = 3600000; // 1 hour in milliseconds

      if (cacheAge < ONE_HOUR) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('Using cached cloud shows from localStorage');
            return parsedData;
          }
        } catch (error) {
          console.error('Error parsing cached cloud shows:', error);
        }
      }
    }
  }

  // If no valid cache, fetch from API
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/cloudShows`,
      {
        next: {
          revalidate: 3600, // 1 hour
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const shows = await response.json();
    const validShows = Array.isArray(shows) ? shows : [];

    // Cache in localStorage for next time
    if (typeof window !== 'undefined' && validShows.length > 0) {
      localStorage.setItem('cloudShowsCache', JSON.stringify(validShows));
      localStorage.setItem('cloudShowsCacheTime', Date.now().toString());
    }

    return validShows;
  } catch (error) {
    console.error('Error fetching cloud shows:', error);

    // If fetch fails, try to use potentially stale cache as fallback
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem('cloudShowsCache');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('Using stale cache as fallback after fetch error');
            return parsedData;
          }
        } catch (e) {
          console.error('Error parsing fallback cached data:', e);
        }
      }
    }

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
