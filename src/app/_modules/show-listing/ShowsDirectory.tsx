'use client';

// Two pages share this:
// - Shows (menu "Shows", /shows): Residents (programme shows, A–Z, link to the
//   show page; filter current / archive) and Guests (THF Presents nights and
//   takeovers from the archive, by DJ / act, newest first or A–Z; click plays).
// - Archiv (menu "Archiv", /latest): every episode, filter by show and genre.
// Square photo tiles with the title, a thin rule and two small labels.
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseISO } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { FiSearch } from 'react-icons/fi';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useData } from '@/context/DataContext';
import { ArchiveContent } from '@/modules/archive/HomeArchiveSection';
import { useCalendarData } from '@/hooks/useCalendarStore';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import type { CalendarEntry, ShowTypes, ValidShow } from '@/types/ResponsesInterface';
import { CMS_URL } from '@/utils/constants';
import { getMixcloudKey } from '@/utils/getMixcloudKey';
import { compactTitle, guestName, isGuestTitle, isHiddenShow, showMatcher } from '@/utils/guests';
import { formatShowDate, getShowGenres, getShowName, processShows } from '@/utils/showUtils';
import { keepWithName } from '@/utils/titles';

type Tab = 'all' | 'residents' | 'guests';
type ResidentFilter = 'all' | 'current' | 'archive';
type GuestSort = 'date' | 'az';
const PAGE = 24;

/** A show with a recording this recent (or on the schedule) counts as current. */
const CURRENT_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

function showImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path.replace(/^http:\/\//, 'https://');
  if (path.startsWith('/')) return `${CMS_URL}${path}`;
  return `${CMS_URL}/uploads/${path}`;
}

type Resident = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  frequency: string;
  genres: string[];
  lastDate: Date | null;
  nextDate: Date | null;
  current: boolean;
};

type Guest = {
  id: string;
  name: string;
  label: string;
  image: string | null;
  date: Date;
  genres: string[];
  show: ValidShow;
};

/** Tile frame shared by residents and guests. */
function Tile({
  image,
  title,
  left,
  right,
  overlay,
}: {
  image: string | null;
  title: string;
  left: string;
  right: string;
  overlay?: React.ReactNode;
}) {
  return (
    <>
      <div className='relative aspect-square overflow-hidden rounded-md bg-thf-blue-900'>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=''
            loading='lazy'
            decoding='async'
            className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-thf-blue-500 to-thf-blue-900 p-6 text-center'>
            <span className='font-bold uppercase text-white/90 text-lg leading-tight line-clamp-3'>{keepWithName(title)}</span>
          </div>
        )}
        {overlay}
      </div>
      {/* div, not h3: the global h3 style would win over these classes */}
      <div
        role='heading'
        aria-level={3}
        className='mt-3 font-sans font-bold uppercase text-[13px] sm:text-[15px] lg:text-base tracking-wide leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors'
        title={title}
      >
        {keepWithName(title)}
      </div>
      <div className='mt-2 border-t border-white/35 pt-1.5 flex items-start justify-between gap-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-white/65'>
        <span className='min-w-0 truncate'>{left}</span>
        <span className='shrink-0'>{right}</span>
      </div>
    </>
  );
}

function GuestTile({ guest }: { guest: Guest }) {
  const t = useTranslations();
  const locale = useLocale();
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const currentShowUrl = useGlobalStore((s) => s.currentShowUrl);
  const showKeySet = useGlobalStore((s) => s.showKeySet);
  const trackIdSet = useGlobalStore((s) => s.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((s) => s.setCurrentShowUrl);
  const { show } = guest;
  const isMixcloud = show.platform === 'mixcloud';
  const isCurrent =
    currentShowUrl === show.url &&
    activePlayer === (isMixcloud ? ActivePlayer.MIXCLOUD : ActivePlayer.SOUNDCLOUD);

  const play = () => {
    if (isMixcloud) showKeySet(getMixcloudKey(show.url));
    else if (show.key) trackIdSet(show.key);
    setCurrentShowUrl(show.url);
  };

  return (
    <button
      type='button'
      onClick={play}
      aria-label={`${t('playShow')}: ${guest.name}`}
      aria-pressed={isCurrent}
      className='group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500 rounded-md'
    >
      <Tile
        image={guest.image}
        title={guest.name}
        left={guest.label}
        right={formatShowDate(guest.date, locale)}
        overlay={
          <span
            aria-hidden
            className={`absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300
              ${
                isCurrent
                  ? 'bg-orange-500 opacity-100'
                  : 'bg-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100'
              }`}
          >
            {isCurrent ? (
              <span className='scale-[0.45]'>
                <BarsSpinner color='#ffffff' />
              </span>
            ) : (
              <Play className='h-5 w-5 translate-x-[1px]' fill='#100f2e' />
            )}
          </span>
        }
      />
    </button>
  );
}

function ResidentTile({ show }: { show: Resident }) {
  const t = useTranslations();
  const locale = useLocale();
  const left = show.current
    ? show.frequency || show.genres.slice(0, 2).join(' · ')
    : t('showsArchiveShow');
  const right = show.nextDate
    ? `${t('showsNext')} ${formatShowDate(show.nextDate, locale)}`
    : show.lastDate
      ? `${t('showsLast')} ${formatShowDate(show.lastDate, locale)}`
      : '';
  return (
    <Link
      href={`/shows/${show.slug}`}
      className='group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500 rounded-md'
    >
      <Tile image={show.image} title={show.title} left={left} right={right} />
    </Link>
  );
}

/** Next start per show from the timetable (both channels), by slug and by title. */
function upcomingByShow(entries: CalendarEntry[]) {
  const now = Date.now();
  const bySlug = new Map<string, Date>();
  const byTitle: { key: string; start: Date }[] = [];
  for (const e of entries) {
    const iso = e.endTime ?? e.end;
    const startIso = e.startTime ?? e.start;
    if (!iso || !startIso || parseISO(iso).getTime() < now) continue;
    const start = parseISO(startIso);
    if (e.showSlug && (!bySlug.has(e.showSlug) || start < bySlug.get(e.showSlug)!)) bySlug.set(e.showSlug, start);
    byTitle.push({ key: compactTitle(e.showTitle || e.summary || e.title || ''), start });
  }
  byTitle.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { bySlug, byTitle };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
        active ? 'border-white bg-white text-dark-blue' : 'border-white/25 text-white/75 hover:border-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function ShowsDirectory({
  shows,
  activeFlagReliable = false,
  mode = 'shows',
}: {
  shows: ShowTypes[];
  /** "shows": Residents / Guests tabs; "archive": every episode */
  mode?: 'shows' | 'archive';
  /** The show source marks running shows itself (thfradio.space); the old backend marks all as active. */
  activeFlagReliable?: boolean;
}) {
  const t = useTranslations();
  // The archive (guests, genres, "last" date) loads with the DataProvider.
  const { cloudShows, isLoadingShows, showsError } = useData();
  const { ch1, ch2 } = useCalendarData();
  const [tab, setTab] = useState<Tab>(mode === 'archive' ? 'all' : 'residents');
  const [filter, setFilter] = useState<ResidentFilter>('all');
  const [sort, setSort] = useState<GuestSort>('date');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Tab from the URL (?tab=residents / ?tab=guests), so it can be linked.
  useEffect(() => {
    if (mode === 'archive') return;
    // Old links to the episode list (/shows?show=… or ?tab=all) now live under /latest
    const search = new URLSearchParams(window.location.search);
    if (search.has('show') || search.get('tab') === 'all') {
      search.delete('tab');
      const qs = search.toString();
      window.location.replace(window.location.pathname.replace(/\/shows\/?$/, '/latest') + (qs ? `?${qs}` : ''));
      return;
    }
    const param = search.get('tab');
    if (param === 'guests' || param === 'residents') setTab(param);
  }, [mode]);

  const archive = useMemo(() => (cloudShows ? processShows(cloudShows) : []), [cloudShows]);
  const upcoming = useMemo(() => upcomingByShow([...ch1, ...ch2]), [ch1, ch2]);

  const residents = useMemo<Resident[]>(() => {
    // Newest recording per show (archive is newest first; longest show name wins)
    const match = showMatcher(shows);
    const latestBySlug = new Map<string, (typeof archive)[number]>();
    for (const r of archive) {
      const slug = match(getShowName(r) || r.name || '');
      if (slug && !latestBySlug.has(slug)) latestBySlug.set(slug, r);
    }
    const since = Date.now() - CURRENT_DAYS * DAY_MS;
    return shows
      .filter((s) => s.title && s.slug && !isHiddenShow(s.title) && !isGuestTitle(s.title))
      .map((s) => {
        const key = compactTitle(s.title);
        const matches = key.length >= 3;
        const latest = latestBySlug.get(s.slug);
        const nextDate =
          upcoming.bySlug.get(s.slug) ??
          (matches ? upcoming.byTitle.find((x) => x.key.startsWith(key))?.start : undefined) ??
          null;
        const lastDate = latest?.date ?? null;
        const current =
          !!nextDate ||
          (!!lastDate && lastDate.getTime() >= since) ||
          (activeFlagReliable && !!s.activeShow);
        return {
          id: String(s.id ?? s.slug),
          slug: s.slug,
          title: s.title.trim(),
          image: showImageUrl(s.image),
          frequency: (s.rrule ?? '').trim(),
          genres: latest ? getShowGenres(latest) : [],
          lastDate,
          nextDate,
          current,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }));
  }, [shows, archive, upcoming, activeFlagReliable]);

  const guests = useMemo<Guest[]>(() => {
    // One tile per act: the newest recording wins (archive is newest first).
    const seen = new Set<string>();
    const out: Guest[] = [];
    for (const r of archive) {
      const title = getShowName(r) || r.name || '';
      if (!isGuestTitle(title)) continue;
      const { name, label } = guestName(title);
      const key = compactTitle(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const image = r.pictures?.extra_large || r.picture || null;
      out.push({
        id: String(r.key ?? r.url),
        name,
        label,
        image: image && !image.includes('placeholder') ? image : null,
        date: r.date,
        genres: getShowGenres(r),
        show: r,
      });
    }
    return out;
  }, [archive]);

  const q = query.trim().toLowerCase();
  const visibleResidents = residents
    .filter((r) => filter === 'all' || (filter === 'current' ? r.current : !r.current))
    .filter((r) => !q || [r.title, ...r.genres].some((x) => x.toLowerCase().includes(q)));
  const visibleGuests = guests
    .filter((g) => !q || [g.name, g.label, ...g.genres].some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === 'az'
        ? a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
        : b.date.getTime() - a.date.getTime(),
    );
  const list = tab === 'residents' ? visibleResidents : visibleGuests;
  const hasMore = tab !== 'all' && list.length > limit;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setLimit((l) => l + PAGE * 2), {
      rootMargin: '800px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit, tab]);

  const programme = useMemo(
    () => shows.filter((s) => s.slug && s.title).map((s) => ({ slug: s.slug, title: s.title })),
    [shows],
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setLimit(PAGE);
    const url = new URL(window.location.href);
    if (next === 'residents') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    if (next !== 'all') url.searchParams.delete('show');
    window.history.replaceState(null, '', url.toString());
  };

  const tabClass = (active: boolean) =>
    `font-sans font-bold text-2xl sm:text-3xl lg:text-5xl leading-none uppercase tracking-tight transition-colors ${
      active ? 'text-white' : 'text-white/30 hover:text-white/70'
    }`;

  return (
    <section className='bg-dark-blue text-white min-h-[80vh] pb-16 lg:pb-24'>
      <div className='layout pt-8 lg:pt-12 pb-5 lg:pb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
        <div className='-mx-6 px-6 sm:mx-0 sm:px-0 flex items-baseline gap-x-5 sm:gap-x-7 lg:gap-x-10 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' role={mode === 'archive' ? undefined : 'tablist'}>
          {mode === 'archive' ? (
            <h1 className={tabClass(true)}>{t('menu.latest.name')}</h1>
          ) : (['residents', 'guests'] as const).map((id) => (
            <button
              key={id}
              type='button'
              role='tab'
              aria-selected={tab === id}
              onClick={() => switchTab(id)}
              className={`${tabClass(tab === id)} shrink-0`}
            >
              {id === 'residents' ? t('showsResidents') : t('showsGuests')}
            </button>
          ))}
        </div>
        {/* All shows has its own search + genre filter */}
        <label className={`relative w-full lg:w-80 ${tab === 'all' ? 'hidden' : 'block'}`}>
          <FiSearch className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50' aria-hidden />
          <input
            type='search'
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t('showsSearch')}
            className='w-full rounded-full border border-white/20 bg-white/5 py-2.5 pl-11 pr-4 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none'
          />
        </label>
      </div>

      <div className={`layout pb-8 lg:pb-10 flex flex-wrap gap-2 ${tab === 'all' ? 'hidden' : ''}`}>
        {tab === 'residents'
          ? (['all', 'current', 'archive'] as const).map((f) => (
              <Chip
                key={f}
                active={filter === f}
                onClick={() => {
                  setFilter(f);
                  setLimit(PAGE);
                }}
              >
                {f === 'all' ? t('showsAll') : f === 'current' ? t('showsCurrent') : t('showsArchive')}
              </Chip>
            ))
          : (['date', 'az'] as const).map((s) => (
              <Chip key={s} active={sort === s} onClick={() => setSort(s)}>
                {s === 'date' ? t('showsNewest') : t('showsAZ')}
              </Chip>
            ))}
      </div>

      <div className='layout'>
        {tab === 'all' ? (
          // Every episode, filterable by show and genre
          <div className='pt-2'>
            <ArchiveContent
              shows={cloudShows}
              loading={isLoadingShows || !cloudShows}
              error={!cloudShows?.length && showsError ? t('archiveLoadError') : null}
              pageSize={40}
              autoLoad
              programme={programme}
            />
          </div>
        ) : !cloudShows ? (
          // Residents need the archive for current / last date, guests come from it
          <div className='flex justify-center py-24'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : list.length === 0 ? (
          <p className='py-24 text-center font-mono text-sm text-white/60'>{t('showsNothing')}</p>
        ) : (
          <>
            <ul
              className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 sm:gap-x-5 gap-y-8 lg:gap-y-10'
              role='list'
            >
              {tab === 'residents'
                ? visibleResidents.slice(0, limit).map((s) => (
                    <li key={s.id} className='min-w-0'>
                      <ResidentTile show={s} />
                    </li>
                  ))
                : visibleGuests.slice(0, limit).map((g) => (
                    <li key={g.id} className='min-w-0'>
                      <GuestTile guest={g} />
                    </li>
                  ))}
            </ul>
            {/* Next batch loads by itself when the end of the grid comes into view */}
            {list.length > limit && (
              <div ref={sentinel} className='flex justify-center py-12'>
                <BarsSpinner color='#ff6314' />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
