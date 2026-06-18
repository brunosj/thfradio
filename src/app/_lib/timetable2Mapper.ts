import type { CalendarEntry } from '@/types/ResponsesInterface';
import { addDays, formatDateYmd, zonedDateTimeToUtcIso } from './dateUtils';
import {
  getTwoWeekBounds,
  isWithinTwoWeekBounds,
  type TwoWeekBounds,
} from './calendarRange';

export interface Timetable2Event {
  id: string;
  title: string;
  start_dt: string;
  end_dt: string;
  notes?: string;
  tz?: string;
}

export interface Timetable2Response {
  events?: Timetable2Event[];
}

const DEFAULT_TZ = 'Europe/Berlin';

/**
 * Normalizes API datetime strings with hours >= 24.
 * TeamUp-style: the date field is already the end calendar day, and 24:30 means
 * 00:30 on that date — not another day roll (e.g. 2026-06-21T24:30:00 → 2026-06-21T00:30:00).
 */
export function normalizeDateTimeString(dt: string): string {
  const match = dt.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2}):(\d{2})$/,
  );
  if (!match) return dt;

  const [, datePart, hourPart, minutePart, secondPart] = match;
  let hours = parseInt(hourPart, 10);
  const date = datePart;

  if (hours >= 24) {
    hours -= 24;
  }

  return `${date}T${String(hours).padStart(2, '0')}:${minutePart}:${secondPart}`;
}

/** If normalized end is not after start, bump end by one day (same-day overnight). */
export function normalizeEndDateTimeString(
  endDt: string,
  startDt: string,
): string {
  const endNorm = normalizeDateTimeString(endDt);
  const startNorm = normalizeDateTimeString(startDt);

  const endDate = new Date(`${endNorm.replace('T', ' ')}`);
  const startDate = new Date(`${startNorm.replace('T', ' ')}`);

  if (endDate <= startDate) {
    const [datePart, timePart] = endNorm.split('T');
    const nextDay = addDays(new Date(`${datePart}T12:00:00`), 1);
    return `${formatDateYmd(nextDay)}T${timePart}`;
  }

  return endNorm;
}

export function timetable2EventToIso(
  dt: string,
  tz: string = DEFAULT_TZ,
  startDt?: string,
): string {
  const normalized =
    startDt && dt !== startDt
      ? normalizeEndDateTimeString(dt, startDt)
      : normalizeDateTimeString(dt);
  return zonedDateTimeToUtcIso(normalized, tz);
}

export function mapTimetable2Events(
  events: Timetable2Event[],
  bounds: TwoWeekBounds = getTwoWeekBounds(),
): CalendarEntry[] {
  const mapped: CalendarEntry[] = [];

  for (const [index, event] of events.entries()) {
    try {
      const tz = event.tz ?? DEFAULT_TZ;
      const startTime = timetable2EventToIso(event.start_dt, tz);
      const endTime = timetable2EventToIso(event.end_dt, tz, event.start_dt);
      const title = event.title?.trim() || 'Show';

      mapped.push({
        id: event.id || `ch2-${index}`,
        title,
        summary: title,
        description: event.notes,
        startTime,
        endTime,
      });
    } catch {
      // skip invalid events
    }
  }

  return mapped
    .filter((entry) => {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      return isWithinTwoWeekBounds(start, end, bounds);
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}
