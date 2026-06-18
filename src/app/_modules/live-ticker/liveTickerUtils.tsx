import { format, isWithinInterval, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
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

const tickerRow =
  'flex items-baseline gap-3 lg:gap-4 text-sm lg:text-[15px] leading-none whitespace-nowrap';
const tickerLabel =
  'inline-flex h-[1em] items-center text-[11px] uppercase tracking-widest font-medium leading-none opacity-55 shrink-0';
const tickerTitle =
  'inline-flex h-[1em] items-center font-medium leading-none shrink-0';
const tickerMeta =
  'inline-flex h-[1em] items-center overflow-hidden font-mono text-xs lg:text-sm tabular-nums leading-none opacity-55 shrink-0';
const tickerMuted =
  'inline-flex h-[1em] items-center leading-none shrink-0 opacity-55 font-normal normal-case tracking-normal';
const tickerDate =
  'inline-flex h-[1em] items-center overflow-hidden font-mono text-xs lg:text-sm tabular-nums leading-none shrink-0';
const tickerShowWhen = 'inline-flex items-baseline gap-1 lg:gap-1.5 shrink-0';
const tickerLoopPad = 'inline-block w-10 shrink-0 leading-none';

function LiveIndicator() {
  return (
    <span className='relative flex h-2 w-2 shrink-0 self-center' aria-hidden>
      <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60' />
      <span className='relative inline-flex h-2 w-2 rounded-full bg-orange-500' />
    </span>
  );
}

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
    return (
      prefix +
      [
        'live',
        currentShow.summary ?? currentShow.title,
        se?.start,
        se?.end,
        nextShow?.summary ?? nextShow?.title,
        nextSe?.start,
      ].join('|')
    );
  }

  if (nextShow) {
    const se = entryIntervalStrings(nextShow);
    return (
      prefix +
      ['upcoming', nextShow.summary ?? nextShow.title, se?.start].join('|')
    );
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
    const sameDayNext =
      nextShow &&
      nextSe &&
      format(parseISO(nextSe.start), 'yyyy-MM-dd') ===
        format(parseISO(curSe.start), 'yyyy-MM-dd');

    return (
      <div className={tickerRow}>
        <LiveIndicator />
        <span className={tickerTitle}>
          {currentShow.summary ?? currentShow.title}
        </span>
        <span className={tickerMeta}>
          {formattedStartHour}–{formattedEndHour}
        </span>
        {sameDayNext && nextShow && (
          <>
            <span className={tickerLabel}>{t('nextShow')}</span>
            <span className={tickerTitle}>
              {nextShow.summary ?? nextShow.title}
            </span>
            <span className={tickerMeta}>
              {nextShowStartTime}–{nextShowEndTime}
            </span>
          </>
        )}
        <span className={tickerLoopPad} aria-hidden />
      </div>
    );
  }

  const nextShowSe = nextShow ? entryIntervalStrings(nextShow) : null;
  const nextShowDate = nextShowSe
    ? format(parseISO(nextShowSe.start), 'dd.MM.yyyy', {
        locale: localeModule,
      })
    : '';

  return (
    <div className={tickerRow}>
      <span className={tickerLabel}>{t('archivePlaying')}</span>
      {nextShow && (
        <>
          <span className={tickerLabel}>{t('nextShow')}</span>
          <span className={tickerShowWhen}>
            <span className={tickerTitle}>
              {nextShow.summary ?? nextShow.title}
            </span>
            <span className={tickerMuted}>{t('on')}</span>
            <span className={tickerDate}>{nextShowDate}</span>
          </span>
          <span className={tickerLoopPad} aria-hidden />
        </>
      )}
    </div>
  );
}
