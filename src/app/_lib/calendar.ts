import type { CalendarEntry } from '@/types/ResponsesInterface';

const CACHE_TTL = 5 * 60 * 1000;

type CalendarCache = {
  data: CalendarEntry[] | null;
  timestamp: number;
};

const calendarCache: CalendarCache = {
  data: null,
  timestamp: 0,
};

const calendar2Cache: CalendarCache = {
  data: null,
  timestamp: 0,
};

function isCacheValid(cache: CalendarCache, now: number): boolean {
  return (
    cache.data !== null && now - cache.timestamp < CACHE_TTL
  );
}

function getBaseUrl(): string {
  return typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? '');
}

async function fetchFromApi(path: string): Promise<CalendarEntry[]> {
  const isClient = typeof window !== 'undefined';
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...(isClient ? { cache: 'no-store' as RequestCache } : { next: { revalidate: 300 } }),
    headers: {
      'Cache-Control': isClient ? 'no-cache' : 'max-age=300',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchCalendar(): Promise<CalendarEntry[]> {
  const now = Date.now();
  if (isCacheValid(calendarCache, now)) {
    return calendarCache.data!;
  }

  try {
    const calendarData = await fetchFromApi('/api/fetchCalendar');
    calendarCache.data = calendarData;
    calendarCache.timestamp = now;
    return calendarData;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return calendarCache.data ?? [];
  }
}

export async function fetchCalendar2(): Promise<CalendarEntry[]> {
  const now = Date.now();
  if (isCacheValid(calendar2Cache, now)) {
    return calendar2Cache.data!;
  }

  try {
    const calendarData = await fetchFromApi('/api/fetchCalendar2');
    calendar2Cache.data = calendarData;
    calendar2Cache.timestamp = now;
    return calendarData;
  } catch (error) {
    console.error('Error fetching calendar 2:', error);
    return calendar2Cache.data ?? [];
  }
}

export async function fetchBothCalendars(): Promise<{
  ch1: CalendarEntry[];
  ch2: CalendarEntry[];
}> {
  const [ch1, ch2] = await Promise.all([fetchCalendar(), fetchCalendar2()]);
  return { ch1, ch2 };
}
