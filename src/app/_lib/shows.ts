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
  const shows = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/cloudShows`,
    {
      next: {
        revalidate: 86400,
      },
    }
  ).then((res) => res.json());

  return Array.isArray(shows) ? shows : [];
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
