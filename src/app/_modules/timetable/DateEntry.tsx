// File: DateEntry.tsx
import React from 'react';
import CalendarEntry from './CalendarEntry';
import { useLocale } from 'next-intl';
import type { CalendarEntry as CalendarEntryProps } from '@/types/ResponsesInterface';

interface DateEntryProps {
  date: string;
  entriesForDate: CalendarEntryProps[];
}

const DateEntry = ({ date, entriesForDate }: DateEntryProps) => {
  const locale = useLocale();

  const startDate = new Date(date);
  const dayName = startDate.toLocaleString(locale, {
    weekday: 'long',
  });
  const day = startDate.toLocaleString(locale, { day: '2-digit' });
  const month = startDate.toLocaleString(locale, { month: '2-digit' });
  const year = startDate.toLocaleString(locale, { year: 'numeric' });
  const formattedDate = `${day}.${month}.${year}`;

  return (
    <div className=' flex flex-col lg:flex-row gap-6 lg:gap-12 font-mono w-full bg-white rounded-xl border border-dark-blue p-6'>
      <div className='w-full lg:w-1/4 flex justify-between around'>
        <p className='font-bold'>{dayName}</p>
        <p className=''>{formattedDate}</p>
      </div>
      <div className='w-full lg:w-3/4 space-y-6'>
        {entriesForDate.map((entry, entryIndex) => (
          <CalendarEntry key={entryIndex} entry={entry} />
        ))}
      </div>
    </div>
  );
};

export default DateEntry;
