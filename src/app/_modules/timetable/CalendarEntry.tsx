// File: CalendarEntry.tsx
import React from 'react';
import type { CalendarEntry as CalendarEntryProps } from '@/types/ResponsesInterface';

import { Wave } from '@/common/assets/WaveSVG';
import { useLocale } from 'next-intl';

const CalendarEntry = ({ entry }: { entry: CalendarEntryProps }) => {
  const locale = useLocale();

  const entryStartDate = new Date(entry.start);
  const entryEndDate = new Date(entry.end);
  const startTime = entryStartDate.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = entryEndDate.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = new Date();

  const isCurrentShow =
    entryStartDate <= currentTime && entryEndDate >= currentTime;

  const summaryClass = isCurrentShow
    ? 'bg-orange-500 text-white font-bold px-1'
    : '';

  return (
    <div className='flex flex-col lg:flex-row gap-0 lg:gap-12'>
      <div className='w-full max-w-fit flex'>
        <p className=''>
          {startTime}
          <span className='px-2 lg:px-3'>
            <Wave />
          </span>
          {endTime}
        </p>
      </div>
      <div className='w-full max-w-fit '>
        <span className={summaryClass}>{entry.summary}</span>
      </div>
    </div>
  );
};

export default CalendarEntry;
