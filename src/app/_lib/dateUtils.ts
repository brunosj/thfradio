/** Native Date helpers (no date-fns). */

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/** Week ends on Saturday (Sunday-start week, matching prior date-fns default). */
export function endOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  return endOfDay(d);
}

export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isWithinInterval(
  date: Date,
  start: Date,
  end: Date,
): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  const hour = map.hour === '24' ? 0 : Number(map.hour);
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

/** Converts a wall-clock datetime in `timeZone` to a UTC ISO string. */
export function zonedDateTimeToUtcIso(
  localDateTime: string,
  timeZone: string,
): string {
  const match = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    throw new Error(`Invalid datetime: ${localDateTime}`);
  }

  const [, ys, ms, ds, hs, mins, ss] = match;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  const h = Number(hs);
  const mi = Number(mins);
  const s = Number(ss);

  let utc = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(utc));
    utc = Date.UTC(y, mo - 1, d, h, mi, s) - offset;
  }

  return new Date(utc).toISOString();
}
