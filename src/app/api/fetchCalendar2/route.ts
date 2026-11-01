import { NextResponse } from 'next/server';
import { getTwoWeekBounds } from '@/app/_lib/calendarRange';
import {
  dropUnknownShowSlugs,
  fetchIntranetTimetable,
} from '@/app/_lib/intranetTimetable';

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
    const entries = await fetchIntranetTimetable(
      apiUrl,
      apiKey,
      getTwoWeekBounds(),
      'ch2',
    );
    return NextResponse.json(await dropUnknownShowSlugs(entries), {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error('fetchCalendar2 error:', error);
    return NextResponse.json([], { status: 200, headers: CACHE_HEADERS });
  }
}
