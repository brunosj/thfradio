// File: WeekGrid.tsx
import React from 'react';
import { isSameDay, parseISO } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import CalendarEventItem from './CalendarEventItem';
import {
  DAY_COLUMN_WIDTH,
  END_DISPLAY_HOUR,
  entryEndIso,
  entryStartIso,
  getBroadcastGridHour,
  getEventDurationMinutes,
  getBroadcastStartMinutes,
  HOUR_HEIGHT,
  MIN_EVENT_HEIGHT,
  START_HOUR,
} from './utils';

interface WeekGridProps {
  days: Date[];
  calendarEntries: CalendarEntry[];
}

function formatGridHour(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  return `${String(displayHour).padStart(2, '0')}:00`;
}

export default function WeekGrid({ days, calendarEntries }: WeekGridProps) {
  const hours = Array.from(
    { length: END_DISPLAY_HOUR - START_HOUR },
    (_, i) => i + START_HOUR,
  );

  const gridHeight = hours.length * HOUR_HEIGHT;
  const now = new Date();

  const entriesByDay = days.map((day) => {
    const dayEntries = calendarEntries.filter((entry) => {
      try {
        const startIso = entryStartIso(entry);
        if (!startIso) return false;
        const startDate = parseISO(startIso);
        return isSameDay(startDate, day);
      } catch {
        return false;
      }
    });

    return { day, entries: dayEntries };
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
                const broadcastHour = getBroadcastGridHour(
                  now,
                  day,
                  START_HOUR,
                  END_DISPLAY_HOUR,
                );
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
            {entriesByDay.map(({ entries }, dayIndex) => (
              <div
                key={dayIndex}
                className='flex-shrink-0 relative'
                style={{
                  width: `${DAY_COLUMN_WIDTH}px`,
                  height: `${gridHeight}px`,
                }}
              >
                {entries.map((entry, entryIndex) => {
                  try {
                    const startIso = entryStartIso(entry);
                    const endIso = entryEndIso(entry);
                    if (!startIso || !endIso) return null;

                    const startTime = parseISO(startIso);
                    const endTime = parseISO(endIso);
                    const startHour = startTime.getHours();

                    if (startHour < START_HOUR) return null;

                    const startMinutes = getBroadcastStartMinutes(startTime);
                    const gridStartMinutes = START_HOUR * 60;
                    const topPosition =
                      ((startMinutes - gridStartMinutes) * HOUR_HEIGHT) / 60;

                    const durationMinutes = getEventDurationMinutes(
                      startTime,
                      endTime,
                    );
                    const rawHeight = (durationMinutes * HOUR_HEIGHT) / 60;
                    const maxHeight = gridHeight - topPosition;
                    const heightInPixels = Math.max(
                      MIN_EVENT_HEIGHT,
                      Math.min(rawHeight, maxHeight),
                    );

                    if (topPosition >= gridHeight) return null;

                    return (
                      <div
                        key={entryIndex}
                        className='group/event absolute left-1 right-1 pointer-events-auto border-t-2 border-orange-500 rounded-t-sm z-10 hover:z-50'
                        style={{
                          top: `${topPosition}px`,
                          height: `${heightInPixels}px`,
                        }}
                      >
                        <CalendarEventItem
                          event={entry}
                          slotHeightPx={heightInPixels}
                        />
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
