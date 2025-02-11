import { DataProvider } from './DataContext';
import type {
  CalendarEntry,
  CloudShowTypes,
  TagsList,
  ShowTypes,
  NewsType,
} from '@/types/ResponsesInterface';
import { fetchCalendar } from '@/lib/calendar';
import { fetchCloudShows, fetchProgrammeShows } from '@/lib/shows';
import { fetchNews } from '@/lib/news';
import { fetchTags } from '@/lib/tags';

async function fetchInitialData(locale: string) {
  try {
    // Fetch locale-dependent data
    const [news, programmeShows] = await Promise.all([
      fetchNews(locale),
      fetchProgrammeShows(locale),
    ]);

    // Fetch locale-independent data
    const [calendarData, cloudShows, tagsList] = await Promise.all([
      fetchCalendar(),
      fetchCloudShows(),
      fetchTags(),
    ]);

    return {
      cloudShows: Array.isArray(cloudShows) ? cloudShows : [],
      tagsList: tagsList || { attributes: { tag: [] } },
      calendarEntries: calendarData,
      programmeShows: Array.isArray(programmeShows) ? programmeShows : [],
      news: Array.isArray(news) ? news : [],
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return {
      cloudShows: [] as CloudShowTypes[],
      tagsList: { attributes: { tag: [] } } as TagsList,
      calendarEntries: [] as CalendarEntry[],
      programmeShows: [] as ShowTypes[],
      news: [] as NewsType[],
    };
  }
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
