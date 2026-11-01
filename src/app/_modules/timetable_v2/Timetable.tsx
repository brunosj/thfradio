// File: Timetable.tsx
import React, { useRef, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import WeekGrid from './WeekGrid';
import { useLocale, useTranslations } from 'next-intl';
import {
  broadcastDay,
  DAY_COLUMN_WIDTH,
  END_DISPLAY_HOUR,
  isLateNight,
  NIGHT_END_HOUR,
} from './utils';
import { useScrollToLive } from './useScrollToLive';

interface TimetableV2Props {
  calendarEntries: CalendarEntry[];
}

export default function TimetableV2({
  calendarEntries = [],
}: TimetableV2Props) {
  // Start from today's broadcast day: at 02:00 that is still yesterday evening
  const today = broadcastDay(new Date());
  const locale = useLocale();
  const t = useTranslations();
  // Compact (08:00 – 04:00) by default; the night until 08:00 on request, and
  // on its own between 04:00 and 08:00 so what's on air is always in the grid.
  const [showNight, setShowNight] = useState(() => isLateNight());
  const endHour = showNight ? NIGHT_END_HOUR : END_DISPLAY_HOUR;

  // Generate days for the 14-day period
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // Single scroll container reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollToLive(scrollContainerRef, calendarEntries.length > 0);

  // Function to format day headers
  const formatDayHeader = (date: Date) => {
    const isToday = isSameDay(date, today);
    const dayName = date.toLocaleString(locale, { weekday: 'short' });
    const dayNumber = format(date, 'd');
    const month = date.toLocaleString(locale, { month: 'short' });

    return (
      <div
        className={`w-full py-1 px-3 text-center border-r border-gray-700 h-8 border-b
                ${isToday ? 'bg-thf-blue-500/20' : 'bg-dark-blue'}`}
      >
        <div className='flex items-center justify-center space-x-2'>
          <p className='text-xs uppercase text-gray-400'>{dayName}</p>
          <p
            className={`text-base ${isToday ? 'font-bold text-orange-400' : 'text-white'}`}
          >
            {dayNumber}
          </p>
          <p className='text-xs uppercase text-gray-400'>{month}</p>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full overflow-hidden bg-dark-blue rounded-xl border border-gray-700'>
      {/* Scrolls both ways; the day row stays on top, the hours on the left */}
      <div
        data-schedule-scroller
        className='overflow-auto scrollbar-hide relative max-h-[calc(100dvh-14rem)] min-h-80'
        ref={scrollContainerRef}
      >
        <div className='flex flex-col'>
          {/* Headers row */}
          <div className='flex sticky top-0 z-30 w-fit border-gray-700 shadow-md transition-shadow duration-200'>
            {/* Empty corner for time column - sticky in both directions */}
            <div className='w-16 h-8 shrink-0 sticky left-0 z-40 bg-dark-blue border-r border-gray-700 flex items-center justify-center border-b'></div>

            {/* Day headers - sticky vertically */}
            <div className='flex'>
              {days.map((day, index) => (
                <div
                  className='shrink-0 bg-dark-blue'
                  style={{ width: `${DAY_COLUMN_WIDTH}px` }}
                  key={index}
                >
                  {formatDayHeader(day)}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <WeekGrid days={days} calendarEntries={calendarEntries} endHour={endHour} />

          <div className='sticky left-0 w-fit px-4 py-3'>
            <button
              type='button'
              onClick={() => setShowNight((v) => !v)}
              aria-expanded={showNight}
              className='font-mono text-xs uppercase tracking-wider text-orange-400 hover:text-orange-300'
            >
              {showNight ? `${t('hideNight')} ↑` : `${t('showNight')} ↓`}
            </button>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styling */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}
