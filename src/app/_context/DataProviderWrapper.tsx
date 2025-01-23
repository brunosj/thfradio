import { DataProvider } from './DataContext';
import type {
  CalendarEntry,
  CloudShowTypes,
  CloudShows,
  NewsType,
  TagsList,
} from '@/types/ResponsesInterface';

async function fetchInitialData(locale: string) {
  try {
    // Fetch calendar data
    const calendarData = await fetchCalendar();

    // Fetch cloud shows
    const cloudShows = await fetchCloudShows();

    // Fetch Strapi data
    const [tagsList, programmeShows, news] = await Promise.all([
      fetchTags(),
      fetchProgrammeShows(locale),
      fetchNews(locale),
    ]);

    return {
      cloudShows: Array.isArray(cloudShows) ? cloudShows : [],
      tagsList: tagsList || {},
      calendarEntries: Array.isArray(calendarData) ? calendarData : [],
      programmeShows: Array.isArray(programmeShows) ? programmeShows : [],
      news: Array.isArray(news) ? news : [],
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return {
      cloudShows: [],
      tagsList: {},
      calendarEntries: [],
      programmeShows: [],
      news: [],
    };
  }
}

async function fetchCalendar(): Promise<CalendarEntry[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fetchCalendar`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return [];
  }
}

async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  const limit = 100;
  const totalItems = 1500;
  const pages = Math.ceil(totalItems / limit);
  const promises = [];

  for (let i = 0; i < pages; i++) {
    const promise = fetch(
      `${process.env.MIXCLOUD_API}?offset=${i * limit}&limit=${limit}`
    )
      .then((res) => res.json())
      .then((data) => data.data);
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  return results.flat().slice(0, totalItems);
}

async function fetchTags() {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}tag-list?populate[tag][populate]=*`
  );
  const data = (await response.json()) as TagsList;
  return data.data;
}

async function fetchProgrammeShows(locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&populate=*`
  );
  const data = (await response.json()) as CloudShows;
  return data.data;
}

async function fetchNews(locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news-items?locale=${locale}&populate=*`
  );
  const data = (await response.json()) as NewsType[];
  return data.data;
}

export async function DataProviderWrapper({
  children,
  locale = 'en',
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  const initialData = await fetchInitialData(locale);
  return <DataProvider initialData={initialData}>{children}</DataProvider>;
}
