import React from 'react';
import { format, addWeeks } from 'date-fns';
import { useTranslations } from 'next-intl';

interface TimetableNavProps {
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
}

export default function TimetableNav({
  currentDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  isPrevDisabled = false,
  isNextDisabled = false,
}: TimetableNavProps) {
  const t = useTranslations();

  // Format the date range for display
  const startDateFormatted = format(currentDate, 'MMM d');
  const endDateFormatted = format(addWeeks(currentDate, 1), 'MMM d, yyyy');

  return (
    <div className='flex items-center justify-between mb-4 font-mono text-white'>
      <div className='text-sm md:text-base'>
        {startDateFormatted} - {endDateFormatted}
      </div>

      <div className='flex space-x-2'>
        <button
          onClick={onPrevWeek}
          className={`px-3 py-1 rounded text-sm ${
            isPrevDisabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          }`}
          aria-label={t('previousWeek')}
          disabled={isPrevDisabled}
        >
          ←
        </button>

        <button
          onClick={onToday}
          className='px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm'
        >
          {t('today')}
        </button>

        <button
          onClick={onNextWeek}
          className={`px-3 py-1 rounded text-sm ${
            isNextDisabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          }`}
          aria-label={t('nextWeek')}
          disabled={isNextDisabled}
        >
          →
        </button>
      </div>
    </div>
  );
}
