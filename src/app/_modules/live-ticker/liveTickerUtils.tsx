import { format, isWithinInterval, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { ArrowRightLong } from '@/common/assets/ArrowRightLong';
import LiveCircle from '@/common/assets/LiveCircle';
import type { CalendarEntry } from '@/types/ResponsesInterface';

export function entryIntervalStrings(
  entry: CalendarEntry,
): { start: string; end: string } | null {
  const start = entry.startTime ?? entry.start;
  const end = entry.endTime ?? entry.end;
  if (!start || !end) return null;
  return { start, end };
}

type TickerTranslate = (key: string) => string;

function parseEntryStart(entry: CalendarEntry): Date | null {
  const se = entryIntervalStrings(entry);
  if (!se) return null;
  try {
    return parseISO(se.start);
  } catch {
    return null;
  }
}

export function findCurrentShow(
  entries: CalendarEntry[],
  now = new Date(),
): CalendarEntry | undefined {
  return entries.find((entry) => {
    const se = entryIntervalStrings(entry);
    if (!se) return false;
    try {
      return isWithinInterval(now, {
        start: parseISO(se.start),
        end: parseISO(se.end),
      });
    } catch {
      return false;
    }
  });
}

export function findNextShow(
  entries: CalendarEntry[],
  now = new Date(),
): CalendarEntry | undefined {
  return entries
    .map((entry) => ({ entry, start: parseEntryStart(entry) }))
    .filter(
      (item): item is { entry: CalendarEntry; start: Date } =>
        item.start !== null && item.start > now,
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.entry;
}

export function getChannelShowMeasureKey(
  entries: CalendarEntry[],
  channelId?: number,
): string {
  const now = new Date();
  const currentShow = findCurrentShow(entries, now);
  const nextShow = findNextShow(entries, now);
  const prefix = channelId !== undefined ? `${channelId}|` : '';

  if (currentShow) {
    const se = entryIntervalStrings(currentShow);
    const nextSe = nextShow ? entryIntervalStrings(nextShow) : null;
    return prefix + [
      'live',
      currentShow.summary ?? currentShow.title,
      se?.start,
      se?.end,
      nextShow?.summary ?? nextShow?.title,
      nextSe?.start,
    ].join('|');
  }

  if (nextShow) {
    const se = entryIntervalStrings(nextShow);
    return prefix + ['upcoming', nextShow.summary ?? nextShow.title, se?.start].join('|');
  }

  return prefix + 'empty';
}

const SHOW_BOUNDARY_CAP_MS = 5 * 60 * 1000;

/** Ms until the next show start/end across entries; capped at 5 min. */
export function getMsUntilNextShowBoundary(
  entriesList: CalendarEntry[][],
  now = Date.now(),
): number | null {
  let nextMs = Infinity;

  for (const entries of entriesList) {
    for (const entry of entries) {
      const se = entryIntervalStrings(entry);
      if (!se) continue;

      try {
        const start = parseISO(se.start).getTime();
        const end = parseISO(se.end).getTime();

        if (start > now) {
          nextMs = Math.min(nextMs, start - now);
        }
        if (now >= start && now < end) {
          nextMs = Math.min(nextMs, end - now);
        }
      } catch {
        // skip invalid entries
      }
    }
  }

  if (nextMs === Infinity) return null;
  return Math.min(nextMs, SHOW_BOUNDARY_CAP_MS);
}

export function getChannelShowContent(
  entries: CalendarEntry[],
  localeModule: Locale,
  t: TickerTranslate,
) {
  const now = new Date();
  const currentShow = findCurrentShow(entries, now);
  const nextShow = findNextShow(entries, now);

  if (!currentShow && !nextShow) {
    return <span />;
  }

  if (currentShow) {
    const curSe = entryIntervalStrings(currentShow);
    if (!curSe) {
      return <span />;
    }
    const formattedStartHour = format(parseISO(curSe.start), 'HH:mm', {
      locale: localeModule,
    });
    const formattedEndHour = format(parseISO(curSe.end), 'HH:mm', {
      locale: localeModule,
    });
    const nextSe = nextShow ? entryIntervalStrings(nextShow) : null;
    const nextShowStartTime = nextSe
      ? format(parseISO(nextSe.start), 'HH:mm', { locale: localeModule })
      : '';
    const nextShowEndTime = nextSe
      ? format(parseISO(nextSe.end), 'HH:mm', { locale: localeModule })
      : '';

    return (
      <div className='uppercase text-sm lg:text-base space-x-3 flex items-center'>
        <LiveCircle className='w-5 h-5 animate-pulse shrink-0' />
        <span>{currentShow.summary ?? currentShow.title}</span>
        <span>
          {formattedStartHour}-{formattedEndHour}
        </span>
        {nextShow &&
          nextSe &&
          format(parseISO(nextSe.start), 'yyyy-MM-dd') ===
            format(parseISO(curSe.start), 'yyyy-MM-dd') && (
            <>
              <span className='px-8'>
                <ArrowRightLong />
              </span>
              <span>{t('nextShow')}:</span>
              <span>{nextShow.summary ?? nextShow.title}</span>
              <span>
                {nextShowStartTime}-{nextShowEndTime}
              </span>
            </>
          )}
      </div>
    );
  }

  const nextShowSe = nextShow ? entryIntervalStrings(nextShow) : null;
  const nextShowDate = nextShowSe
    ? format(parseISO(nextShowSe.start), 'EEEE dd.MM.yyyy', {
        locale: localeModule,
      })
    : '';

  return (
    <span className='text-sm italic'>
      <span className='uppercase'>
        {t('archivePlaying')}
        {' // '}
      </span>
      {nextShow && (
        <span>
          {t('nextShow')}:{' '}
          <span className='not-italic font-normal'>
            {nextShow.summary ?? nextShow.title}
          </span>{' '}
          {t('on')} {nextShowDate}
          {' // '}
        </span>
      )}
    </span>
  );
}
