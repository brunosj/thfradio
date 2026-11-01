'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { useGlobalStore } from '@/hooks/useStore';
import { getEntryAction } from './utils';
import { keepWithName } from '@/utils/titles';

interface CalendarEventItemProps {
  event: CalendarEntry;
  slotHeightPx: number;
}

export default function CalendarEventItem({
  event,
  slotHeightPx,
}: CalendarEventItemProps) {
  const t = useTranslations();
  const trackIdSet = useGlobalStore((state) => state.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((state) => state.setCurrentShowUrl);

  const startIso = event.startTime ?? event.start;
  const endIso = event.endTime ?? event.end;
  if (!startIso || !endIso) {
    return null;
  }

  const startDate = parseISO(startIso);
  const endDate = parseISO(endIso);

  const startTime = format(startDate, 'HH:mm');
  const endTime = format(endDate, 'HH:mm');
  const showTitle = event.summary ?? event.title ?? '';

  const now = new Date();
  const isCurrentShow = now >= startDate && now <= endDate;

  const action = getEntryAction(event);

  const isTight = slotHeightPx < 36;
  const isCompact = slotHeightPx >= 36 && slotHeightPx <= 52;

  const baseClasses = isCurrentShow
    ? 'bg-orange-500 text-white border border-orange-300'
    : 'bg-thf-blue-500/70 text-white group-hover/event:bg-thf-blue-500 group-focus-within/event:bg-thf-blue-500';

  const paddingClass = isTight ? 'p-1' : 'px-1.5 py-1';

  // As many title lines as fit under the time row (13px text, 1.2 line height),
  // so a 1-hour slot shows two full lines instead of a cut-off second one.
  const TITLE_LINE_PX = 15.6;
  const titleLines = Math.max(1, Math.floor((slotHeightPx - 23) / TITLE_LINE_PX));
  const titleClampClass = isTight ? 'line-clamp-1 text-xs' : 'line-clamp-(--lines) text-[13px] leading-[1.2]';

  const timeOpacity = isCurrentShow
    ? 'opacity-100'
    : 'opacity-90 group-hover/event:opacity-100';

  const containerClasses = `w-full h-full flex flex-col overflow-hidden transition-all duration-150
        group-hover/event:min-h-full group-hover/event:h-auto group-hover/event:overflow-visible
        group-hover/event:shadow-lg group-hover/event:rounded-sm
        ${paddingClass} ${baseClasses}`;

  const actionClasses = `cursor-pointer text-left
        group-focus-within/event:min-h-full group-focus-within/event:h-auto group-focus-within/event:overflow-visible
        group-focus-within/event:shadow-lg group-focus-within/event:rounded-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1 focus-visible:ring-offset-dark-blue`;

  const content = (
    <>
      {isTight ? (
        <div
          className={`hidden group-hover/event:flex group-focus-within/event:flex justify-between items-center mb-0.5 font-mono text-xs ${timeOpacity}`}
        >
          <span>{startTime}</span>
          <span>{endTime}</span>
        </div>
      ) : (
        <div className='flex justify-between items-center mb-0.5 group-hover/event:mb-1 leading-none'>
          <span className={`font-mono text-[11px] ${timeOpacity}`}>{startTime}</span>
          {!isCompact && (
            <span className={`font-mono text-[11px] ${timeOpacity}`}>{endTime}</span>
          )}
          {isCompact && (
            <span
              className={`font-mono text-[11px] ${timeOpacity} hidden group-hover/event:inline group-focus-within/event:inline`}
            >
              {endTime}
            </span>
          )}
        </div>
      )}

      <div
        style={{ ['--lines' as string]: titleLines }}
        className={`break-words ${titleClampClass} group-hover/event:line-clamp-none group-focus-within/event:line-clamp-none
          ${action ? 'underline-offset-2 decoration-1 group-hover/event:underline group-focus-within/event:underline' : ''}`}
      >
        {action?.kind === 'recording' && (
          <Play
            className='inline-block h-3 w-3 mr-1 -mt-0.5 align-middle shrink-0'
            fill='currentColor'
          />
        )}
        {keepWithName(showTitle)}
        {action?.kind === 'show' && (
          <span
            aria-hidden='true'
            className='ml-1 opacity-0 transition-opacity group-hover/event:opacity-100 group-focus-within/event:opacity-100'
          >
            →
          </span>
        )}
      </div>
    </>
  );

  if (action?.kind === 'show') {
    return (
      <Link
        href={action.href}
        className={`${containerClasses} ${actionClasses}`}
        title={showTitle}
        aria-label={t('timetableOpenShow', {
          title: showTitle,
          start: startTime,
          end: endTime,
        })}
      >
        {content}
      </Link>
    );
  }

  if (action?.kind === 'recording') {
    return (
      <button
        type='button'
        onClick={() => {
          trackIdSet(action.trackId);
          setCurrentShowUrl(action.url);
        }}
        className={`${containerClasses} ${actionClasses}`}
        title={showTitle}
        aria-label={t('timetablePlayRecording', {
          title: showTitle,
          start: startTime,
          end: endTime,
        })}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={containerClasses} title={showTitle}>
      {content}
    </div>
  );
}
