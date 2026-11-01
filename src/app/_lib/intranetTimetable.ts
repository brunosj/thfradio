import type { CalendarEntry } from '@/types/ResponsesInterface';
import { addDays, formatDateYmd, zonedDateTimeToUtcIso } from './dateUtils';
import {
  getTwoWeekBounds,
  getTwoWeekQueryDates,
  isWithinTwoWeekBounds,
  type TwoWeekBounds,
} from './calendarRange';
import { fetchProgrammeShows } from './shows';
import { showMatcher } from '@/utils/guests';

// ---------------------------------------------------------------------------
// Timetable from thfradio.space ("Intranet"):
//   GET {url}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (Bearer key)
//   → { events: [{ id, title, start_dt, end_dt, tz, notes, custom: {...} }] }
// start_dt / end_dt are Berlin wall-clock without offset; `custom` values are
// string arrays (thf_type, thf_show_slug, thf_recording_track_id, ...).
// Used by /api/fetchCalendar (channel 1) and /api/fetchCalendar2 (channel 2).
// ---------------------------------------------------------------------------

export type IntranetCustomFields = Record<
  string,
  string[] | string | null | undefined
>;

export interface IntranetTimetableEvent {
  id: string;
  subcalendar_id?: number | string;
  title: string;
  start_dt: string;
  end_dt: string;
  notes?: string;
  tz?: string;
  who?: string;
  custom?: IntranetCustomFields;
}

export interface IntranetTimetableResponse {
  events?: IntranetTimetableEvent[];
}

const DEFAULT_TZ = 'Europe/Berlin';
const TIMETABLE_REVALIDATE_SECONDS = 300;

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

export function intranetEventToIso(
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

/** First non-empty value of a custom field (values are string arrays). */
function customValue(
  custom: IntranetCustomFields | undefined,
  key: string,
): string | undefined {
  const raw = custom?.[key];
  const values = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function mapIntranetTimetableEvents(
  events: IntranetTimetableEvent[],
  bounds: TwoWeekBounds = getTwoWeekBounds(),
  idPrefix = 'ch',
): CalendarEntry[] {
  const mapped: CalendarEntry[] = [];

  for (const [index, event] of events.entries()) {
    try {
      const tz = event.tz ?? DEFAULT_TZ;
      const startTime = intranetEventToIso(event.start_dt, tz);
      const endTime = intranetEventToIso(event.end_dt, tz, event.start_dt);
      const title = event.title?.trim() || 'Show';
      const custom = event.custom;

      mapped.push({
        id: event.id ? String(event.id) : `${idPrefix}-${index}`,
        title,
        summary: title,
        description: event.notes,
        startTime,
        endTime,
        type: customValue(custom, 'thf_type'),
        showId: customValue(custom, 'thf_show_id'),
        showTitle: customValue(custom, 'thf_show_title'),
        showSlug: customValue(custom, 'thf_show_slug'),
        imageUrl: customValue(custom, 'thf_image_url'),
        recordingTrackId: customValue(custom, 'thf_recording_track_id'),
        recordingUrl: customValue(custom, 'thf_recording_soundcloud_url'),
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

/** Fetch + map one intranet timetable channel. Throws on network / HTTP errors. */
export async function fetchIntranetTimetable(
  apiUrl: string,
  apiKey: string,
  bounds: TwoWeekBounds,
  idPrefix: string,
): Promise<CalendarEntry[]> {
  const { startDate, endDate } = getTwoWeekQueryDates(bounds);
  const url = new URL(apiUrl);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: TIMETABLE_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(
      `Intranet timetable ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as IntranetTimetableResponse;
  const events = Array.isArray(data?.events) ? data.events : [];
  return mapIntranetTimetableEvents(events, bounds, idPrefix);
}

/**
 * The website's programme shows (slug + title). Null when the list can't be
 * loaded, so callers keep entries as they are. Cached under the "shows" tag.
 */
async function fetchProgrammeShowList(): Promise<{ slug: string; title: string }[] | null> {
  try {
    const shows = await fetchProgrammeShows('en');
    if (!Array.isArray(shows)) return null;
    const list = shows
      .filter((s) => typeof s?.slug === 'string' && s.slug && typeof s?.title === 'string')
      .map((s) => ({ slug: s.slug as string, title: s.title as string }));
    return list.length ? list : null;
  } catch (error) {
    console.error('Timetable: could not load the programme shows:', error);
    return null;
  }
}

/** "Rerun: Show", "Show (R)", "Wiederholung – Show" → "Show" */
const stripRerun = (title: string) =>
  title
    .replace(/^\s*(rerun|re-run|wiederholung)\s*[:\-–]\s*/i, '')
    .replace(/\s*\((r|rerun)\)\s*/gi, ' ')
    .trim();

/**
 * Show page links for timetable entries:
 * - a showSlug from the intranet is kept if that show page exists, else dropped (no 404s);
 * - entries without one (Teamup feed, unmatched slots) are matched by title to a
 *   programme show, the longest matching name wins; reruns go to the original show.
 * THF Presents nights and takeovers stay unlinked.
 */
export async function linkTimetableShows(entries: CalendarEntry[]): Promise<CalendarEntry[]> {
  if (!entries.length) return entries;
  const programme = await fetchProgrammeShowList();
  if (!programme) return entries;
  const known = new Set(programme.map((p) => p.slug));
  const match = showMatcher(programme);
  return entries.map((entry) => {
    if (entry.showSlug && known.has(entry.showSlug)) return entry;
    // The intranet's show name first (slot titles can differ), then the slot title
    const slug =
      (entry.showTitle ? match(entry.showTitle) : null) ??
      match(stripRerun(entry.summary ?? entry.title ?? ''));
    return slug ? { ...entry, showSlug: slug } : { ...entry, showSlug: undefined };
  });
}

/** @deprecated use linkTimetableShows (kept for existing imports) */
export const dropUnknownShowSlugs = linkTimetableShows;
