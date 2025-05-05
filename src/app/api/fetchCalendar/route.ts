import { NextResponse } from 'next/server';
import nodeIcal from 'node-ical';
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  endOfWeek,
} from 'date-fns';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import type { CalendarComponent, VEvent } from 'node-ical';

// Set revalidation period to 5 minutes
export const revalidate = 300;

type CalendarEntries = { [key: string]: CalendarComponent };

export async function GET() {
  try {
    // Use promisified version of nodeIcal.fromURL
    const calendarEntries = await new Promise<CalendarEntries>(
      (resolve, reject) => {
        nodeIcal.fromURL(
          'https://ics.teamup.com/feed/ksn22z3grmc5p1xhzp/7027389.ics',
          {},
          (err, data) => {
            if (err) reject(err);
            resolve(data as CalendarEntries);
          }
        );
      }
    );

    const now = startOfDay(new Date());
    const endOfCurrentWeek = endOfDay(addDays(endOfWeek(now), 1));
    const veventEntries = Object.values(calendarEntries) as VEvent[];

    const upcomingShows: CalendarEntry[] = veventEntries
      .filter((entry: VEvent) => entry.type === 'VEVENT')
      .filter((show: VEvent) => {
        const showStart = new Date(show.start);
        const showEnd = new Date(show.end);
        return (
          isWithinInterval(showStart, { start: now, end: endOfCurrentWeek }) &&
          isWithinInterval(showEnd, { start: now, end: endOfCurrentWeek })
        );
      })
      .map((event: VEvent) => ({
        start: new Date(event.start).toISOString(),
        end: new Date(event.end).toISOString(),
        summary: event.summary,
        description: event.description,
        location: event.location,
      }))
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

    return NextResponse.json(upcomingShows, {
      status: 200,
      headers: {
        // Set cache control to allow caching with revalidation
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
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
