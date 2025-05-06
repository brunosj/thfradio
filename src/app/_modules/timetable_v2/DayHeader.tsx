import React from 'react';
import { format } from 'date-fns';
import { useLocale } from 'next-intl';

interface DayHeaderProps {
  date: Date;
}

export default function DayHeader({ date }: DayHeaderProps) {
  const locale = useLocale();
  const isToday = new Date().toDateString() === date.toDateString();

  // Format the day name and date based on locale
  const dayName = date.toLocaleString(locale, { weekday: 'short' });
  const dayNumber = format(date, 'd');
  // Use locale-sensitive month formatting
  const month = date.toLocaleString(locale, { month: 'short' });

  return (
    <div
      className={`w-full py-2 px-3 text-center border-r border-gray-700 h-full
                ${isToday ? 'bg-thf-blue-500/20' : ''}`}
    >
      <div className='flex items-center justify-center space-x-2'>
        <p className='text-base  uppercase text-gray-400'>{dayName}</p>
        <p
          className={`text-xl ${isToday ? 'font-bold text-orange-400' : 'text-white'}`}
        >
          {dayNumber}
        </p>
        <p className='text-base uppercase text-gray-400'>{month}</p>
      </div>
    </div>
  );
}
