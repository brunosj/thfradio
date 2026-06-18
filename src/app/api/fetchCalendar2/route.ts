import { NextResponse } from 'next/server';
import {
  getTwoWeekBounds,
  getTwoWeekQueryDates,
} from '@/app/_lib/calendarRange';
import {
  mapTimetable2Events,
  type Timetable2Response,
} from '@/app/_lib/timetable2Mapper';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET() {
  const apiUrl = process.env.CALENDAR_2_URL;
  const apiKey = process.env.CALENDAR_2_KEY;

  if (!apiUrl || !apiKey) {
    console.error('fetchCalendar2: CALENDAR_2_URL or CALENDAR_2_KEY missing');
    return NextResponse.json([], { status: 200, headers: CACHE_HEADERS });
  }

  try {
    const bounds = getTwoWeekBounds();
    const { startDate, endDate } = getTwoWeekQueryDates(bounds);
    const url = new URL(apiUrl);
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(
        `fetchCalendar2: upstream error ${response.status} ${response.statusText}`,
      );
      return NextResponse.json([], { status: 200, headers: CACHE_HEADERS });
    }

    const data = (await response.json()) as Timetable2Response;
    const events = Array.isArray(data?.events) ? data.events : [];
    const entries = mapTimetable2Events(events, bounds);

    return NextResponse.json(entries, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    console.error('fetchCalendar2 error:', error);
    return NextResponse.json([], { status: 200, headers: CACHE_HEADERS });
  }
}
