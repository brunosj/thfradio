'use client';

import { format, parseISO } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { useGlobalStore } from '@/hooks/useStore';
import {
  entryEndIso,
  entryStartIso,
  findNextDayWithShows,
  getEntryAction,
  groupSeries,
} from './utils';
import { MobileSeriesItem } from './SeriesBlock';
import { keepWithName } from '@/utils/titles';

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
  const trackIdSet = useGlobalStore((state) => state.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((state) => state.setCurrentShowUrl);
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
      {groupSeries(sortedEntries).map((item, index) => {
        if (item.kind === 'series') return <MobileSeriesItem key={item.key} item={item} />;
        const entry = item.entry;
        const startIso = entryStartIso(entry);
        const endIso = entryEndIso(entry);
        if (!startIso || !endIso) return null;

        const startDate = parseISO(startIso);
        const endDate = parseISO(endIso);
        const startTime = format(startDate, 'HH:mm');
        const endTime = format(endDate, 'HH:mm');
        const showTitle = entry.summary ?? entry.title ?? '';
        const isCurrentShow = now >= startDate && now <= endDate;
        const action = getEntryAction(entry);
        const key = `${startIso}-${index}`;

        const surfaceClasses = `min-h-11 rounded-lg border-l-2 border-orange-500 px-3 py-2.5
              ${
                isCurrentShow
                  ? 'bg-orange-500 text-white border border-orange-300 border-l-orange-300'
                  : 'bg-thf-blue-500/70 text-white'
              }`;

        const timeAndTitle = (
          <>
            <span
              className={`font-mono text-xs ${isCurrentShow ? 'opacity-100' : 'opacity-90'}`}
            >
              {startTime} – {endTime}
            </span>
            <span className='text-sm leading-snug wrap-break-word'>{keepWithName(showTitle)}</span>
          </>
        );

        if (!action) {
          return (
            <li
              key={key}
              className={`${surfaceClasses} flex flex-col justify-center gap-0.5`}
            >
              {timeAndTitle}
            </li>
          );
        }

        const actionClasses = `${surfaceClasses} w-full flex items-center gap-3 text-left cursor-pointer transition-colors
              ${isCurrentShow ? 'hover:bg-orange-400' : 'hover:bg-thf-blue-500'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-blue`;

        const ariaLabel = t(
          action.kind === 'show' ? 'timetableOpenShow' : 'timetablePlayRecording',
          { title: showTitle, start: startTime, end: endTime },
        );

        const inner = (
          <>
            <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
              {timeAndTitle}
            </span>
            {action.kind === 'recording' ? (
              <Play className='h-4 w-4 shrink-0' fill='currentColor' />
            ) : (
              <span aria-hidden='true' className='shrink-0 text-base opacity-80'>
                →
              </span>
            )}
          </>
        );

        return (
          <li key={key}>
            {action.kind === 'show' ? (
              <Link href={action.href} className={actionClasses} aria-label={ariaLabel}>
                {inner}
              </Link>
            ) : (
              <button
                type='button'
                onClick={() => {
                  trackIdSet(action.trackId);
                  setCurrentShowUrl(action.url);
                }}
                className={actionClasses}
                aria-label={ariaLabel}
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
