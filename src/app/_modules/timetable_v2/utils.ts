// File: utils.ts
import { parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

export function entryStartIso(entry: CalendarEntry): string | undefined {
  return entry.startTime ?? entry.start;
}

export function entryEndIso(entry: CalendarEntry): string | undefined {
  return entry.endTime ?? entry.end;
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
