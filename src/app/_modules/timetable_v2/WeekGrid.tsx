// File: WeekGrid.tsx
import React from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import CalendarEventItem from './CalendarEventItem';
import { SeriesBlock } from './SeriesBlock';
import {
  DAY_COLUMN_WIDTH,
  entryEndIso,
  entryStartIso,
  getBroadcastGridHour,
  groupSeries,
  HOUR_HEIGHT,
  MIN_EVENT_HEIGHT,
  START_HOUR,
} from './utils';

interface WeekGridProps {
  days: Date[];
  calendarEntries: CalendarEntry[];
  /** Last grid hour: 28 = 04:00 (compact), 32 = 08:00 (night shown). */
  endHour: number;
}

function formatGridHour(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  return `${String(displayHour).padStart(2, '0')}:00`;
}

/** Wall-clock minutes since midnight of `day` (25:30 → 1530). */
function gridMinutes(date: Date, day: Date): number {
  return (
    differenceInCalendarDays(date, day) * 1440 +
    date.getHours() * 60 +
    date.getMinutes()
  );
}

/**
 * One column per broadcast day (08:00 until 04:00 or 08:00 the next morning).
 * A show is drawn in every column it overlaps, cut at the column's edges, so
 * shows after midnight sit under the evening they belong to.
 */
export default function WeekGrid({ days, calendarEntries, endHour }: WeekGridProps) {
  const hours = Array.from({ length: endHour - START_HOUR }, (_, i) => i + START_HOUR);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const now = new Date();

  const timed = calendarEntries
    .map((entry) => {
      const s = entryStartIso(entry);
      const e = entryEndIso(entry);
      if (!s || !e) return null;
      try {
        return { entry, start: parseISO(s), end: parseISO(e) };
      } catch {
        return null;
      }
    })
    .filter((x): x is { entry: CalendarEntry; start: Date; end: Date } => x !== null);

  const columns = days.map((day) => {
    const colStart = new Date(day);
    colStart.setHours(START_HOUR, 0, 0, 0);
    const colEnd = new Date(day);
    colEnd.setHours(endHour, 0, 0, 0); // rolls over into the next morning
    const entries = timed
      .filter((t) => t.start < colEnd && t.end > colStart)
      .map((t) => t.entry);
    return { day, colStart, colEnd, items: groupSeries(entries) };
  });

  return (
    <div className='relative w-full min-w-fit'>
      <div className='flex flex-col'>
        {hours.map((hour, hourIndex) => (
          <div
            key={hourIndex}
            className='flex w-full'
            style={{ height: `${HOUR_HEIGHT}px` }}
          >
            <div
              className='w-16 h-full flex-shrink-0 sticky left-0 z-20 bg-dark-blue border-r border-gray-700'
              style={{
                height: `${HOUR_HEIGHT}px`,
                borderTop: hourIndex > 0 ? '1px solid rgb(55, 65, 81)' : 'none',
                marginTop: hourIndex > 0 ? '-1px' : '0',
              }}
            >
              <div className='h-full flex items-start justify-end pr-3 pl-2'>
                <span className='text-xs text-gray-400 pt-1'>
                  {formatGridHour(hour)}
                </span>
              </div>
            </div>

            <div className='flex flex-nowrap'>
              {days.map((day, dayIndex) => {
                const broadcastHour = getBroadcastGridHour(now, day, START_HOUR, endHour);
                const isCurrentHour = broadcastHour === hour;

                return (
                  <div
                    key={`${dayIndex}-${hourIndex}`}
                    className={`flex-shrink-0 border-b border-r border-gray-700 relative
                              ${isCurrentHour ? 'bg-thf-blue-500/20' : ''}`}
                    style={{
                      width: `${DAY_COLUMN_WIDTH}px`,
                      height: `${HOUR_HEIGHT}px`,
                    }}
                  >
                    {hour === 24 && (
                      <div className='absolute inset-x-0 top-0 border-t border-dashed border-gray-500/60 pointer-events-none' />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className='absolute top-0 left-0 right-0 bottom-0 pointer-events-none'>
        <div className='flex h-full'>
          <div className='w-16 flex-shrink-0' />

          <div className='flex flex-nowrap'>
            {columns.map(({ day, colStart, colEnd, items }, dayIndex) => (
              <div
                key={dayIndex}
                className='flex-shrink-0 relative'
                style={{
                  width: `${DAY_COLUMN_WIDTH}px`,
                  height: `${gridHeight}px`,
                }}
              >
                {items.map((item, entryIndex) => {
                  // Cut at the column's edges (08:00 / 04:00 or 08:00)
                  const shownStart = item.start > colStart ? item.start : colStart;
                  const shownEnd = item.end < colEnd ? item.end : colEnd;
                  if (shownEnd <= shownStart) return null;

                  const topPosition =
                    ((gridMinutes(shownStart, day) - START_HOUR * 60) * HOUR_HEIGHT) / 60;
                  if (topPosition < 0 || topPosition >= gridHeight) return null;

                  const rawHeight =
                    ((gridMinutes(shownEnd, day) - gridMinutes(shownStart, day)) * HOUR_HEIGHT) / 60;
                  const heightInPixels = Math.max(
                    MIN_EVENT_HEIGHT,
                    Math.min(rawHeight, gridHeight - topPosition),
                  );
                  // For "jump to what's on air" (useScrollToLive)
                  const marks = {
                    'data-start': item.start.getTime(),
                    'data-end': item.end.getTime(),
                  };

                  if (item.kind === 'series') {
                    // One block for a night / takeover, a row per slot
                    return (
                      <div
                        key={`${item.key}-${dayIndex}`}
                        {...marks}
                        className='absolute left-1 right-1 pointer-events-auto border-t-2 border-orange-500 rounded-t-sm z-10'
                        style={{ top: `${topPosition}px`, height: `${heightInPixels}px` }}
                      >
                        <SeriesBlock item={item} from={shownStart} to={shownEnd} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={entryIndex}
                      {...marks}
                      className='group/event absolute left-1 right-1 pointer-events-auto border-t-2 border-orange-500 rounded-t-sm z-10 hover:z-50 focus-within:z-50'
                      style={{
                        top: `${topPosition}px`,
                        height: `${heightInPixels}px`,
                      }}
                    >
                      <CalendarEventItem
                        event={item.entry}
                        slotHeightPx={heightInPixels}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
