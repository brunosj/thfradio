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

// Add a new cached version of the function
export async function fetchCloudShowsCached(): Promise<CloudShowTypes[]> {
  try {
    // Get the API URL, defaulting to localhost if not defined
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const apiUrl = `${apiBaseUrl}/api/cloudShows`;

    // Use Next.js cache
    const response = await fetch(apiUrl, {
      next: {
        revalidate: 43200, // 12 hours to match API route
      },
      // Add cache headers to ensure proper caching
      cache: 'force-cache',
    });

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
