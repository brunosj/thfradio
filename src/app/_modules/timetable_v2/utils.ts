// File: utils.ts
import { parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

/**
 * Groups calendar entries by day
 */
export function groupEntriesByDay(entries: CalendarEntry[], days: Date[]) {
  return days.map((day) => ({
    date: day,
    events: entries.filter((entry) => {
      try {
        const startDate = parseISO(entry.start);
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
      const startDate = parseISO(entry.start);
      const endDate = parseISO(entry.end);
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
