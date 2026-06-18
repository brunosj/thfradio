// File: utils.ts
import { parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

export const HOUR_HEIGHT = 56;
export const DAY_COLUMN_WIDTH = 280;
export const START_HOUR = 8;
/** Grid extends to 04:00 the next morning (shown on the start day column). */
export const END_DISPLAY_HOUR = 28;
export const MIN_EVENT_HEIGHT = 24;

export function entryStartIso(entry: CalendarEntry): string | undefined {
  return entry.startTime ?? entry.start;
}

export function entryEndIso(entry: CalendarEntry): string | undefined {
  return entry.endTime ?? entry.end;
}

/** Duration in minutes (absolute, timezone-safe). */
export function getEventDurationMinutes(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

/** Minutes from midnight on the event's start day to its start time (local). */
export function getBroadcastStartMinutes(start: Date): number {
  return start.getHours() * 60 + start.getMinutes();
}

/** Minutes from midnight on the event's start day to its end (local, for grid layout). */
export function getBroadcastEndMinutes(start: Date, end: Date): number {
  const startDay = startOfDay(start);
  return (end.getTime() - startDay.getTime()) / 60000;
}

/** Duration for grid layout on the start-day column (caps overnight to same column). */
export function getBroadcastDurationMinutes(start: Date, end: Date): number {
  return getEventDurationMinutes(start, end);
}

/**
 * Grid hour (8–27) for "now" on a day column, including early-morning
 * hours that belong to the previous evening's schedule.
 */
export function getBroadcastGridHour(
  now: Date,
  columnDay: Date,
  startHour: number,
  endDisplayHour: number,
): number | null {
  if (isSameDay(now, columnDay)) {
    const h = now.getHours();
    if (h >= startHour) return h;
    return null;
  }

  const nextDay = addDays(columnDay, 1);
  const lateNightCutoff = endDisplayHour - 24;
  if (isSameDay(now, nextDay) && now.getHours() < lateNightCutoff) {
    return now.getHours() + 24;
  }

  return null;
}

/**
 * Groups calendar entries by day
 */
export function groupEntriesByDay(entries: CalendarEntry[], days: Date[]) {
  return days.map((day) => ({
    date: day,
    events: entries.filter((entry) => {
      try {
        const startIso = entryStartIso(entry);
        if (!startIso) return false;
        const startDate = parseISO(startIso);
        return isSameDay(startDate, day);
      } catch {
        return false;
      }
    }),
  }));
}

/**
 * Finds all entries that are currently active
 */
export function getCurrentShows(entries: CalendarEntry[]) {
  const now = new Date();

  return entries.filter((entry) => {
    try {
      const startIso = entryStartIso(entry);
      const endIso = entryEndIso(entry);
      if (!startIso || !endIso) return false;
      const startDate = parseISO(startIso);
      const endDate = parseISO(endIso);
      return now >= startDate && now <= endDate;
    } catch {
      return false;
    }
  });
}

/**
 * Generate a two-week date range
 */
export function generateTwoWeekRange(startDate = new Date()) {
  const start = startOfDay(startDate);
  return Array.from({ length: 14 }, (_, i) => addDays(start, i));
}

/** Next day in range (after fromDay) that has at least one show. */
export function findNextDayWithShows(
  days: Date[],
  entriesByDay: { date: Date; events: CalendarEntry[] }[],
  fromDay: Date,
): Date | null {
  const fromIndex = days.findIndex((d) => isSameDay(d, fromDay));
  if (fromIndex === -1) return null;

  for (let i = fromIndex + 1; i < days.length; i++) {
    if (entriesByDay[i]?.events.length > 0) {
      return days[i];
    }
  }
  return null;
}
