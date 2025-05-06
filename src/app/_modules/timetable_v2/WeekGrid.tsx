// File: WeekGrid.tsx
import React from 'react';
import { isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import CalendarEventItem from './CalendarEventItem';

interface WeekGridProps {
  days: Date[];
  calendarEntries: CalendarEntry[];
}

export default function WeekGrid({ days, calendarEntries }: WeekGridProps) {
  // Constants
  const HOUR_HEIGHT = 80; // Reduced from 100px to 80px per hour
  const START_HOUR = 10; // 10am
  const END_HOUR = 24; // Midnight (24 for calculations)

  // Create an array of hours from 10am to midnight
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => i + START_HOUR
  );

  // Group entries by day
  const entriesByDay = days.map((day) => {
    // Get all entries for this day
    const dayEntries = calendarEntries.filter((entry) => {
      try {
        const startDate = parseISO(entry.start);
        return isSameDay(startDate, day);
      } catch {
        return false;
      }
    });

    return { day, entries: dayEntries };
  });

  return (
    <div className='relative w-full min-w-fit'>
      {/* Time grid */}
      <div className='flex flex-col'>
        {hours.map((hour, hourIndex) => (
          <div
            key={hourIndex}
            className='flex w-full'
            style={{ height: `${HOUR_HEIGHT}px` }}
          >
            {/* Hour label on the left - now position:sticky with perfectly aligned borders */}
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
                  {hour === 0 ? '00:00' : `${hour}:00`}
                </span>
              </div>
            </div>

            {/* Day columns */}
            <div className='flex flex-nowrap'>
              {days.map((day, dayIndex) => {
                const isCurrentHour =
                  new Date().getHours() === hour && isSameDay(new Date(), day);

                return (
                  <div
                    key={`${dayIndex}-${hourIndex}`}
                    className={`w-[280px] flex-shrink-0 border-b border-r border-gray-700 relative
                              ${isCurrentHour ? 'bg-thf-blue-500/20' : ''}`}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {/* This is just the grid cell */}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Events layer with absolute positioning */}
      <div className='absolute top-0 left-0 right-0 bottom-0 pointer-events-none'>
        <div className='flex h-full'>
          {/* Hour spacer column - needs to be the same width as the sticky time column*/}
          <div className='w-16 flex-shrink-0'></div>

          {/* Event columns */}
          <div className='flex flex-nowrap'>
            {entriesByDay.map(({ entries }, dayIndex) => (
              <div
                key={dayIndex}
                className='w-[280px] flex-shrink-0 relative h-full'
              >
                {entries.map((entry, entryIndex) => {
                  try {
                    const startTime = parseISO(entry.start);
                    const endTime = parseISO(entry.end);

                    // Only display if the event starts within our time range
                    const startHour = startTime.getHours();
                    if (startHour < START_HOUR || startHour >= END_HOUR)
                      return null;

                    // Calculate the hour offset (relative to our 10am start)
                    const hourOffset = startHour - START_HOUR;
                    const startMinutes = startTime.getMinutes();

                    // Calculate top position from the start of the grid
                    const topPosition =
                      hourOffset * HOUR_HEIGHT +
                      (startMinutes * HOUR_HEIGHT) / 60;

                    // Calculate duration and height
                    const durationMinutes = differenceInMinutes(
                      endTime,
                      startTime
                    );
                    // Convert duration to proper height based on new HOUR_HEIGHT
                    const heightInPixels = Math.max(
                      35,
                      (durationMinutes * HOUR_HEIGHT) / 60
                    );

                    return (
                      <div
                        key={entryIndex}
                        className='absolute left-1 right-1 pointer-events-auto border-t-2 border-orange-500 rounded-t-sm overflow-hidden'
                        style={{
                          top: `${topPosition}px`,
                          height: `${heightInPixels}px`,
                          zIndex: 10,
                        }}
                      >
                        <CalendarEventItem event={entry} />
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
