import {
  addDays,
  addWeeks,
  endOfDay,
  endOfWeek,
  formatDateYmd,
  isWithinInterval,
  startOfDay,
} from './dateUtils';

export type TwoWeekBounds = { start: Date; end: Date };

/** Matches the 2-week window used by channel 1 calendar fetch. */
export function getTwoWeekBounds(now = new Date()): TwoWeekBounds {
  const start = startOfDay(now);
  const end = endOfDay(addDays(endOfWeek(addWeeks(start, 1)), 1));
  return { start, end };
}

export function getTwoWeekQueryDates(bounds: TwoWeekBounds): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: formatDateYmd(bounds.start),
    endDate: formatDateYmd(bounds.end),
  };
}

export function isWithinTwoWeekBounds(
  start: Date,
  end: Date,
  bounds: TwoWeekBounds,
): boolean {
  return (
    isWithinInterval(start, bounds.start, bounds.end) &&
    isWithinInterval(end, bounds.start, bounds.end)
  );
}
