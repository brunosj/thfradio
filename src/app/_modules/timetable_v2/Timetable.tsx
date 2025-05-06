// File: Timetable.tsx
import React, { useRef } from 'react';
import { addDays, startOfDay, format } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import WeekGrid from './WeekGrid';
import { useLocale } from 'next-intl';

interface TimetableV2Props {
  calendarEntries: CalendarEntry[];
}

export default function TimetableV2({
  calendarEntries = [],
}: TimetableV2Props) {
  // Always start from today
  const today = startOfDay(new Date());
  const locale = useLocale();

  // Generate days for the 14-day period
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // Single scroll container reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Function to format day headers
  const formatDayHeader = (date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString();
    const dayName = date.toLocaleString(locale, { weekday: 'short' });
    const dayNumber = format(date, 'd');
    const month = date.toLocaleString(locale, { month: 'short' });

    return (
      <div
        className={`w-full py-2 px-3 text-center border-r border-gray-700 h-10
                ${isToday ? 'bg-blue-900/30' : ''}`}
      >
        <div className='flex items-center justify-center space-x-2'>
          <p className='text-base uppercase text-gray-400'>{dayName}</p>
          <p
            className={`text-xl ${isToday ? 'font-bold text-orange-400' : 'text-white'}`}
          >
            {dayNumber}
          </p>
          <p className='text-base uppercase text-gray-400'>{month}</p>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full overflow-hidden bg-dark-blue rounded-xl border border-gray-700'>
      <div className='overflow-x-auto scrollbar-hide' ref={scrollContainerRef}>
        <div className='flex'>
          {/* Sticky time column and grid */}
          <div className='flex flex-col'>
            {/* Empty time corner + day headers */}
            <div className='flex border-b border-gray-700'>
              {/* Empty corner for time column - sticky */}
              <div className='w-16 h-10 flex-shrink-0 sticky left-0 z-20 bg-dark-blue border-r border-gray-700 flex items-center justify-center'></div>

              {/* Day headers */}
              <div className='flex'>
                {days.map((day, index) => (
                  <div className='flex-shrink-0 w-[280px]' key={index}>
                    {formatDayHeader(day)}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar grid */}
            <WeekGrid days={days} calendarEntries={calendarEntries} />
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
