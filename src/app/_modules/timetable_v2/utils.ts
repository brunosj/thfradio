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

/**
 * What clicking a timetable entry does:
 * - a show slug (reruns carry the original show's slug) → open /shows/[slug]
 * - otherwise a public recording (reruns) → play it in the site player
 * - otherwise nothing (entry stays non-clickable)
 */
export type EntryAction =
  | { kind: 'show'; href: string }
  | { kind: 'recording'; trackId: string; url: string }
  | null;

export function getEntryAction(entry: CalendarEntry): EntryAction {
  if (entry.showSlug) {
    return { kind: 'show', href: `/shows/${encodeURIComponent(entry.showSlug)}` };
  }
  if (entry.recordingTrackId) {
    return {
      kind: 'recording',
      trackId: entry.recordingTrackId,
      url: entry.recordingUrl ?? '',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Series blocks: back-to-back slots of one night / takeover
// ("THF Presents: HABITUS w/ ELSA", "… w/ APRS", …) are shown as one block
// with the series as heading and each slot with its time and name.
// ---------------------------------------------------------------------------

export type SeriesSlot = { entry: CalendarEntry; name: string; start: Date; end: Date };

export type TimetableItem =
  | { kind: 'single'; entry: CalendarEntry; start: Date; end: Date }
  | { kind: 'series'; key: string; title: string; start: Date; end: Date; slots: SeriesSlot[] };

/** Max gap between two slots of one block. */
const SERIES_GAP_MS = 15 * 60 * 1000;

/** "THF Presents: HABITUS w/ ELSA" → { series: "THF Presents: HABITUS", name: "ELSA" } */
export function splitSeriesTitle(title: string): { series: string; name: string } | null {
  const clean = title.replace(/\((\s*w\/[^)]*)\)/i, '$1').replace(/\s+/g, ' ').trim();
  const m = clean.match(/^(.+?)\s+(?:w\/|with)\s*(.*)$/i);
  if (!m || m[1].trim().length < 3) return null;
  return { series: m[1].trim(), name: m[2].trim() };
}

const seriesKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Entries in start order, with back-to-back slots of one series merged. */
export function groupSeries(entries: CalendarEntry[]): TimetableItem[] {
  const timed = entries
    .map((entry) => {
      const s = entryStartIso(entry);
      const e = entryEndIso(entry);
      return s && e ? { entry, start: parseISO(s), end: parseISO(e) } : null;
    })
    .filter((x): x is { entry: CalendarEntry; start: Date; end: Date } => x !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const items: TimetableItem[] = [];
  let run: { key: string; title: string; slots: SeriesSlot[] } | null = null;

  const flush = () => {
    if (!run) return;
    if (run.slots.length > 1) {
      items.push({
        kind: 'series',
        key: `${run.key}-${run.slots[0].start.getTime()}`,
        title: run.title,
        start: run.slots[0].start,
        end: run.slots[run.slots.length - 1].end,
        slots: run.slots,
      });
    } else {
      const s = run.slots[0];
      items.push({ kind: 'single', entry: s.entry, start: s.start, end: s.end });
    }
    run = null;
  };

  for (const t of timed) {
    const split = splitSeriesTitle(t.entry.summary ?? t.entry.title ?? '');
    const key = split ? seriesKey(split.series) : '';
    const last = run?.slots[run.slots.length - 1];
    const joins =
      !!run &&
      !!split &&
      run.key === key &&
      !!last &&
      t.start.getTime() >= last.end.getTime() - 60 * 1000 &&
      t.start.getTime() - last.end.getTime() <= SERIES_GAP_MS;
    if (!joins) flush();
    if (split) {
      if (!run) run = { key, title: split.series, slots: [] };
      run.slots.push({ entry: t.entry, name: split.name, start: t.start, end: t.end });
    } else {
      items.push({ kind: 'single', entry: t.entry, start: t.start, end: t.end });
    }
  }
  flush();
  return items;
}
