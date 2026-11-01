import { NextResponse } from 'next/server';
import nodeIcal from 'node-ical';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import type { CalendarComponent, VEvent } from 'node-ical';
import {
  getTwoWeekBounds,
  isWithinTwoWeekBounds,
  type TwoWeekBounds,
} from '@/app/_lib/calendarRange';
import {
  dropUnknownShowSlugs,
  linkTimetableShows,
  fetchIntranetTimetable,
} from '@/app/_lib/intranetTimetable';

// Set revalidation period to 5 minutes
export const revalidate = 300;

// Channel 1 comes from the thfradio.space timetable API. The Teamup ICS feed
// stays as fallback (API error, missing key, empty result) and can be forced
// with CALENDAR_1_SOURCE=teamup.
const DEFAULT_CALENDAR_1_URL =
  'https://www.thfradio.space/api/public/timetable/1';
const TEAMUP_ICS_URL =
  'https://ics.teamup.com/feed/ksn22z3grmc5p1xhzp/7027389.ics';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

type CalendarEntries = { [key: string]: CalendarComponent };

/** Returns null when the intranet can't be used, so the caller falls back to ICS. */
async function fetchFromIntranet(
  bounds: TwoWeekBounds,
): Promise<CalendarEntry[] | null> {
  if (process.env.CALENDAR_1_SOURCE === 'teamup') return null;

  const apiUrl = process.env.CALENDAR_1_URL || DEFAULT_CALENDAR_1_URL;
  const apiKey = process.env.CALENDAR_1_KEY || process.env.CALENDAR_2_KEY;
  if (!apiKey) {
    console.warn('fetchCalendar: no CALENDAR_1_KEY / CALENDAR_2_KEY, using Teamup ICS');
    return null;
  }

  try {
    const entries = await fetchIntranetTimetable(apiUrl, apiKey, bounds, 'ch1');
    if (entries.length === 0) {
      console.warn('fetchCalendar: intranet timetable empty, using Teamup ICS');
      return null;
    }
    return await dropUnknownShowSlugs(entries);
  } catch (error) {
    console.error('fetchCalendar: intranet timetable failed, using Teamup ICS:', error);
    return null;
  }
}

async function fetchFromTeamup(bounds: TwoWeekBounds): Promise<CalendarEntry[]> {
  // Use promisified version of nodeIcal.fromURL
  const calendarEntries = await new Promise<CalendarEntries>(
    (resolve, reject) => {
      nodeIcal.fromURL(TEAMUP_ICS_URL, {}, (err, data) => {
        if (err) reject(err);
        resolve(data as CalendarEntries);
      });
    }
  );

  const veventEntries = Object.values(calendarEntries) as VEvent[];

  return veventEntries
    .filter((entry: VEvent) => entry.type === 'VEVENT')
    .filter((show: VEvent) => {
      const showStart = new Date(show.start);
      const showEnd = new Date(show.end);
      return isWithinTwoWeekBounds(showStart, showEnd, bounds);
    })
    .map((event: VEvent, index) => {
      const startTime = new Date(event.start).toISOString();
      const endTime = new Date(event.end).toISOString();
      const title = event.summary ?? 'Show';
      return {
        id: String(event.uid ?? `cal-${index}`),
        title,
        startTime,
        endTime,
        summary: event.summary,
        description: event.description,
      } satisfies CalendarEntry;
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

export async function GET() {
  const bounds = getTwoWeekBounds();

  const intranetEntries = await fetchFromIntranet(bounds);
  if (intranetEntries) {
    return NextResponse.json(intranetEntries, {
      status: 200,
      headers: { ...CACHE_HEADERS, 'X-Calendar-Source': 'intranet' },
    });
  }

  try {
    // Teamup knows no show pages: link entries to shows by title
    const upcomingShows = await linkTimetableShows(await fetchFromTeamup(bounds));
    return NextResponse.json(upcomingShows, {
      status: 200,
      headers: { ...CACHE_HEADERS, 'X-Calendar-Source': 'teamup' },
    });
  } catch (error) {
    console.error('Calendar API Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar entries' },
      {
        status: 500,
        headers: {
          // Even errors can be cached briefly to prevent hammering the server
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
