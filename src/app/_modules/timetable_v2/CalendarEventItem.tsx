import React from 'react';
import { format, parseISO } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
interface CalendarEventItemProps {
  event: CalendarEntry;
  slotHeightPx: number;
}

export default function CalendarEventItem({
  event,
  slotHeightPx,
}: CalendarEventItemProps) {
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

  const isTight = slotHeightPx < 36;
  const isCompact = slotHeightPx >= 36 && slotHeightPx <= 52;

  const baseClasses = isCurrentShow
    ? 'bg-orange-500 text-white border border-orange-300'
    : 'bg-thf-blue-500/70 text-white group-hover/event:bg-thf-blue-500';

  const paddingClass = isTight ? 'p-1' : 'px-1.5 py-1';

  const titleClampClass = isTight
    ? 'line-clamp-1 text-xs'
    : isCompact
      ? 'line-clamp-2 text-xs'
      : 'line-clamp-2 text-sm';

  const timeOpacity = isCurrentShow
    ? 'opacity-100'
    : 'opacity-90 group-hover/event:opacity-100';

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden transition-all duration-150
        group-hover/event:min-h-full group-hover/event:h-auto group-hover/event:overflow-visible
        group-hover/event:shadow-lg group-hover/event:rounded-sm
        ${paddingClass} ${baseClasses}`}
      title={showTitle}
    >
      {isTight ? (
        <div
          className={`hidden group-hover/event:flex justify-between items-center mb-0.5 font-mono text-xs ${timeOpacity}`}
        >
          <span>{startTime}</span>
          <span>{endTime}</span>
        </div>
      ) : (
        <div className='flex justify-between items-center mb-0.5 group-hover/event:mb-1'>
          <span className={`font-mono text-xs ${timeOpacity}`}>{startTime}</span>
          {!isCompact && (
            <span className={`font-mono text-xs ${timeOpacity}`}>{endTime}</span>
          )}
          {isCompact && (
            <span
              className={`font-mono text-xs ${timeOpacity} hidden group-hover/event:inline`}
            >
              {endTime}
            </span>
          )}
        </div>
      )}

      <div
        className={`break-words ${titleClampClass} group-hover/event:line-clamp-none`}
      >
        {showTitle}
      </div>
    </div>
  );
}
