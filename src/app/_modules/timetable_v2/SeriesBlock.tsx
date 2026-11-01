'use client';

// One night / takeover in the timetable: the series as heading
// ("THF Presents: HABITUS", 18:00–00:00) and each slot as a row with its
// time and name ("19:00 APRS"). Rows keep their own link / recording.
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { useGlobalStore } from '@/hooks/useStore';
import { getEntryAction, type SeriesSlot } from './utils';
import { RerunIcon } from './RerunIcon';

type SeriesItem = { title: string; start: Date; end: Date; slots: SeriesSlot[] };

const hhmm = (d: Date) => format(d, 'HH:mm');

function SlotRow({
  slot,
  series,
  className,
  style,
  heading,
}: {
  slot: SeriesSlot;
  series: string;
  className: string;
  style?: React.CSSProperties;
  /** Shown above the time and name (desktop: the series title sits in the first slot). */
  heading?: React.ReactNode;
}) {
  const t = useTranslations();
  const trackIdSet = useGlobalStore((s) => s.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((s) => s.setCurrentShowUrl);
  const now = Date.now();
  const live = slot.start.getTime() <= now && slot.end.getTime() > now;
  const action = getEntryAction(slot.entry);
  const name = slot.name || 'TBA';
  const full = `${series} w/ ${name}`;

  const row = (
    <>
      <span className='shrink-0 font-mono text-xs opacity-80'>{hhmm(slot.start)}</span>
      <span className={`min-w-0 flex-1 truncate ${slot.name ? '' : 'opacity-60'}`} title={full}>
        {name}
      </span>
      {slot.rerun && <RerunIcon />}
      {action?.kind === 'recording' && <Play className='h-3 w-3 shrink-0' fill='currentColor' />}
      {action?.kind === 'show' && (
        <span aria-hidden className='shrink-0 opacity-60'>
          →
        </span>
      )}
    </>
  );
  const inner = heading ? (
    <span className='flex w-full min-w-0 flex-col'>
      {heading}
      <span className='flex items-center gap-2'>{row}</span>
    </span>
  ) : (
    row
  );

  const classes = `${className} flex items-center gap-2 ${live ? 'bg-orange-500 text-white' : ''}`;
  const labelArgs = { title: full, start: hhmm(slot.start), end: hhmm(slot.end) };

  if (action?.kind === 'show') {
    return (
      <Link
        href={action.href}
        style={style}
        className={`${classes} hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300`}
        aria-label={t('timetableOpenShow', labelArgs)}
      >
        {inner}
      </Link>
    );
  }
  if (action?.kind === 'recording') {
    return (
      <button
        type='button'
        style={style}
        onClick={() => {
          trackIdSet(action.trackId);
          setCurrentShowUrl(action.url);
        }}
        className={`${classes} w-full text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300`}
        aria-label={t('timetablePlayRecording', labelArgs)}
      >
        {inner}
      </button>
    );
  }
  return (
    <div style={style} className={classes}>
      {inner}
    </div>
  );
}

/** Desktop grid: fills the block's full time span; rows sized by slot length. */
export function SeriesBlock({
  item,
  from = item.start,
  to = item.end,
}: {
  item: SeriesItem;
  /** The part of the night this column shows (the block can be cut at 08:00 / 04:00). */
  from?: Date;
  to?: Date;
}) {
  const shownMinutes = (slot: { start: Date; end: Date }) =>
    (Math.min(slot.end.getTime(), to.getTime()) - Math.max(slot.start.getTime(), from.getTime())) / 60000;
  const slots = item.slots.filter((slot) => shownMinutes(slot) > 0);
  const now = Date.now();
  const live = item.start.getTime() <= now && item.end.getTime() > now;
  return (
    <div
      className={`h-full flex flex-col overflow-hidden rounded-b-sm text-white ${
        live ? 'bg-thf-blue-500 ring-1 ring-orange-300' : 'bg-thf-blue-500/70'
      }`}
    >
      {/* Rows sized by slot length, so each sits on its hour; the title rides in the first one */}
      <div className='flex min-h-0 flex-1 flex-col'>
        {slots.map((slot, i) => (
          <SlotRow
            key={i}
            slot={slot}
            series={item.title}
            heading={
              i === 0 ? (
                <span className='truncate text-sm font-bold leading-tight' title={`${item.title} · ${hhmm(item.start)}–${hhmm(item.end)}`}>
                  {item.title}
                </span>
              ) : undefined
            }
            style={{ flexGrow: Math.max(1, shownMinutes(slot)), flexBasis: 0 }}
            className='min-h-0 !items-start px-1.5 pt-1 text-sm border-t border-white/15 first:border-t-0'
          />
        ))}
      </div>
    </div>
  );
}

/** Mobile list: heading row, then one row per slot. */
export function MobileSeriesItem({ item }: { item: SeriesItem }) {
  const now = Date.now();
  const live = item.start.getTime() <= now && item.end.getTime() > now;
  return (
    <li
      data-start={item.start.getTime()}
      data-end={item.end.getTime()}
      className={`overflow-hidden rounded-lg border-l-2 text-white ${
        live ? 'border-orange-300 bg-thf-blue-500' : 'border-orange-500 bg-thf-blue-500/70'
      }`}
    >
      <div className='px-3 pt-2.5 pb-2 border-b border-white/20'>
        <span className='font-mono text-xs opacity-90'>
          {hhmm(item.start)} – {hhmm(item.end)}
        </span>
        <span className='block text-sm font-bold leading-snug'>{item.title}</span>
      </div>
      <div className='flex flex-col'>
        {item.slots.map((slot, i) => (
          <SlotRow
            key={i}
            slot={slot}
            series={item.title}
            className='min-h-10 px-3 py-2 text-sm border-t border-white/10 first:border-t-0'
          />
        ))}
      </div>
    </li>
  );
}
