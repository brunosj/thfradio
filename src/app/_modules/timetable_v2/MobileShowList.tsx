'use client';

import { format, parseISO } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import { entryEndIso, entryStartIso, findNextDayWithShows } from './utils';

interface MobileShowListProps {
  entries: CalendarEntry[];
  days: Date[];
  selectedDay: Date;
  entriesByDay: { date: Date; events: CalendarEntry[] }[];
  onSelectDay: (day: Date) => void;
}

function sortEntriesByStart(entries: CalendarEntry[]): CalendarEntry[] {
  return [...entries].sort((a, b) => {
    const aIso = entryStartIso(a);
    const bIso = entryStartIso(b);
    if (!aIso || !bIso) return 0;
    return parseISO(aIso).getTime() - parseISO(bIso).getTime();
  });
}

export default function MobileShowList({
  entries,
  days,
  selectedDay,
  entriesByDay,
  onSelectDay,
}: MobileShowListProps) {
  const t = useTranslations();
  const sortedEntries = sortEntriesByStart(entries);
  const nextDayWithShows = findNextDayWithShows(
    days,
    entriesByDay,
    selectedDay,
  );

  if (sortedEntries.length === 0) {
    return (
      <div className='rounded-xl border border-gray-700 bg-thf-blue-500/30 px-4 py-8 text-center'>
        <p className='text-sm text-gray-300 font-mono'>{t('noShowsThisDay')}</p>
        {nextDayWithShows && (
          <button
            type='button'
            onClick={() => onSelectDay(nextDayWithShows)}
            className='mt-4 min-h-11 px-4 py-2 text-sm font-mono text-orange-400 hover:text-orange-300 underline underline-offset-4'
          >
            {t('nextDayWithShows')}
          </button>
        )}
      </div>
    );
  }

  const now = new Date();

  return (
    <ul className='space-y-2' role='list'>
      {sortedEntries.map((entry, index) => {
        const startIso = entryStartIso(entry);
        const endIso = entryEndIso(entry);
        if (!startIso || !endIso) return null;

        const startDate = parseISO(startIso);
        const endDate = parseISO(endIso);
        const startTime = format(startDate, 'HH:mm');
        const endTime = format(endDate, 'HH:mm');
        const showTitle = entry.summary ?? entry.title ?? '';
        const isCurrentShow = now >= startDate && now <= endDate;

        return (
          <li
            key={`${startIso}-${index}`}
            className={`min-h-11 rounded-lg border-l-2 border-orange-500 px-3 py-2.5 flex flex-col justify-center gap-0.5
              ${
                isCurrentShow
                  ? 'bg-orange-500 text-white border border-orange-300 border-l-orange-300'
                  : 'bg-thf-blue-500/70 text-white'
              }`}
          >
            <span
              className={`font-mono text-xs ${isCurrentShow ? 'opacity-100' : 'opacity-90'}`}
            >
              {startTime} – {endTime}
            </span>
            <span className='text-sm leading-snug wrap-break-word'>{showTitle}</span>
          </li>
        );
      })}
    </ul>
  );
}
