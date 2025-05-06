import type { CalendarEntry } from '@/types/ResponsesInterface';

// In-memory cache to prevent redundant fetches
const calendarCache = {
  data: null as CalendarEntry[] | null,
  timestamp: 0,
  cacheTime: 5 * 60 * 1000, // 5 minutes
};

export async function fetchCalendar(): Promise<CalendarEntry[]> {
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (
    calendarCache.data &&
    now - calendarCache.timestamp < calendarCache.cacheTime
  ) {
    return calendarCache.data;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fetchCalendar`, {
      next: { revalidate: 300 }, // 5 minutes cache using Next.js 15 fetch cache
      headers: {
        'Cache-Control': 'max-age=300', // 5 minutes browser cache
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const calendarData = Array.isArray(data) ? data : [];

    // Update our cache
    calendarCache.data = calendarData;
    calendarCache.timestamp = now;

    return calendarData;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    // Return cached data even if expired in case of error
    if (calendarCache.data) {
      return calendarCache.data;
    }
    return [];
  }
}
