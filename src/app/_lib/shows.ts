import type { CloudShowTypes, ShowTypes } from '@/types/ResponsesInterface';
import { fetchMixcloudShows } from './mixcloud';
import { fetchSoundcloudShows } from './soundcloud';

type ShowsType = {
  data: ShowTypes[];
};

export async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  // Fetch Mixcloud shows first with caching
  console.log('Fetching Mixcloud shows...');
  const mixcloudShows = await fetchMixcloudShows().catch((error) => {
    console.error('Error fetching Mixcloud shows:', error);
    return [];
  });

  // Then try to fetch Soundcloud shows with caching
  console.log('Fetching SoundCloud shows...');
  let soundcloudShows: CloudShowTypes[] = [];
  try {
    // Check if SoundCloud environment variables are set
    if (
      !process.env.SOUNDCLOUD_CLIENT_ID ||
      !process.env.SOUNDCLOUD_CLIENT_SECRET ||
      !process.env.SOUNDCLOUD_USER_ID
    ) {
      console.error('SoundCloud environment variables missing: ', {
        clientId: process.env.SOUNDCLOUD_CLIENT_ID ? 'Set' : 'Missing',
        clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET ? 'Set' : 'Missing',
        userId: process.env.SOUNDCLOUD_USER_ID ? 'Set' : 'Missing',
      });
    }

    soundcloudShows = await fetchSoundcloudShows();
    console.log(
      `SoundCloud fetch successful: ${soundcloudShows.length} shows retrieved`
    );

    // Debug - verify the shows have the expected format
    if (soundcloudShows.length > 0) {
      // Check first show format
      const sampleShow = soundcloudShows[0];
      console.log('Sample SoundCloud show:', {
        name: sampleShow.name,
        platform: sampleShow.platform,
        tagCount: sampleShow.tags?.length || 0,
        hasPicture: !!sampleShow.pictures?.extra_large,
      });

      // Check for any shows without tags
      const showsWithoutTags = soundcloudShows.filter(
        (show) =>
          !show.tags || !Array.isArray(show.tags) || show.tags.length === 0
      );
      if (showsWithoutTags.length > 0) {
        console.warn(
          `${showsWithoutTags.length} SoundCloud shows have no tags`
        );
      }
    }
  } catch (error) {
    console.error('Error fetching Soundcloud shows:', error);
  }

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
    // Get the API URL, defaulting to localhost if not defined
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const apiUrl = `${apiBaseUrl}/api/cloudShows`;

    console.log(`Fetching cloud shows from: ${apiUrl}`);

    // Use Next.js cache instead of localStorage
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
      console.error(
        'API returned error:',
        data.error,
        'timestamp:',
        data.timestamp
      );
      return data.shows || [];
    }

    // Handle the original array format
    const shows = Array.isArray(data) ? data : data.shows || [];
    console.log(`Successfully fetched ${shows.length} shows`);

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
