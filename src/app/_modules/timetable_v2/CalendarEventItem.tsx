import React from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

interface CalendarEventItemProps {
  event: CalendarEntry;
}

export default function CalendarEventItem({ event }: CalendarEventItemProps) {
  // Parse dates to display time
  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);

  // Format times
  const startTime = format(startDate, 'HH:mm');
  const endTime = format(endDate, 'HH:mm');

  // Calculate duration
  const durationMinutes = differenceInMinutes(endDate, startDate);
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10; // Round to 1 decimal place

  // Check if this is the current show
  const now = new Date();
  const isCurrentShow = now >= startDate && now <= endDate;

  // For showing content based on available space
  const isLongDuration = durationMinutes >= 90; // 1.5 hours or more
  const hasEnoughSpace = durationMinutes >= 60; // 1 hour or more
  const isCompactDuration = durationMinutes < 45; // 30-min slots need compact layout
  const tooltipText = `${event.summary} (${startTime}-${endTime})`;

  return (
    <div
      aria-label={tooltipText}
      className={`group relative w-full h-full flex flex-col
                ${isCurrentShow ? 'bg-orange-500 text-white  border border-orange-300' : 'bg-thf-blue-500/70 text-white'}`}
    >
      <div className='overflow-hidden p-2 flex flex-col h-full'>
        {isCompactDuration ? (
          <>
            <span
              className={`font-mono text-[10px] leading-none ${isCurrentShow ? 'opacity-100' : 'opacity-90'}`}
            >
              {startTime}
            </span>
            <div className='text-xs leading-tight mt-1 line-clamp-1 font-medium'>
              {event.summary}
            </div>
          </>
        ) : (
          <>
            <div className='flex justify-between items-center mb-1'>
              <span
                className={`font-mono text-xs ${isCurrentShow ? 'opacity-100' : 'opacity-90'}`}
              >
                {startTime}
              </span>
              <span
                className={`font-mono text-xs ${isCurrentShow ? 'opacity-100' : 'opacity-90'}`}
              >
                {endTime}
              </span>
            </div>

            <div
              className={` ${hasEnoughSpace ? 'text-sm' : 'text-xs'} break-words line-clamp-3`}
            >
              {event.summary}
            </div>
          </>
        )}

        {isLongDuration && (
          <div className='text-xs mt-auto opacity-75 self-end'>
            {durationHours}h
          </div>
        )}
      </div>

      {isCompactDuration && (
        <div className='pointer-events-none absolute left-0 top-full mt-1 z-[9999] hidden w-max max-w-[260px] rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg group-hover:block'>
          {event.summary}
          <span className='ml-1 opacity-80'>
            ({startTime}-{endTime})
          </span>
        </div>
      )}
    </div>
  );
}
