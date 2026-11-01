'use client';

// The whole archive as tiles with search and genre family chips (after NTS
// Explore), like Latest Shows on the intranet. Filtering runs over all
// shows; only `pageSize` tiles are rendered at a time, more on demand.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from '@/i18n/routing';
import type { CloudShowTypes } from '@/types/ResponsesInterface';
import { toArchiveShows } from '@/utils/showUtils';
import { NO_GENRE_FILTER, applyGenreFilter, genreFamilies, isFiltered, type GenreFilter } from '@/utils/genres';
import BarsSpinner from '@/common/ui/BarsSpinner';
import ArchiveFilterBar from './ArchiveFilterBar';
import ShowPicker, { type ShowOption } from './ShowPicker';
import { isGuestTitle, showMatcher } from '@/utils/guests';

/** Programme show for the show filter (archive page). */
export type ArchiveProgrammeShow = { slug: string; title: string };
const GUESTS = '__guests';
import ArchiveTile from './ArchiveTile';

export default function ArchiveBrowser({
  shows,
  pageSize = 20,
  autoLoad = false,
  fullArchiveHref,
  programme,
}: {
  shows: CloudShowTypes[];
  pageSize?: number;
  /** Load the next batch when the end of the grid scrolls into view */
  autoLoad?: boolean;
  /** Homepage: end with a button to the full archive page instead of "show more" */
  fullArchiveHref?: string;
  /** Archive page: the programme shows, enables the show filter (?show=slug) */
  programme?: ArchiveProgrammeShow[];
}) {
  const t = useTranslations();
  const all = useMemo(() => toArchiveShows(shows), [shows]);

  // Show of each recording: the programme show its title starts with (longest
  // name wins), or Guests for THF Presents nights and takeovers.
  const showOf = useMemo(() => {
    const map = new Map<string, string>();
    if (!programme?.length) return map;
    const match = showMatcher(programme);
    for (const s of all) {
      const key = isGuestTitle(s.title) ? GUESTS : match(s.title);
      if (key) map.set(s.id, key);
    }
    return map;
  }, [all, programme]);

  const showOptions = useMemo<ShowOption[]>(() => {
    if (!programme?.length) return [];
    const count = new Map<string, number>();
    for (const key of showOf.values()) count.set(key, (count.get(key) ?? 0) + 1);
    const opts = programme
      .filter((p) => count.has(p.slug))
      .map((p) => ({ key: p.slug, label: p.title.trim(), count: count.get(p.slug)! }))
      .sort((a, b) => a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }));
    const guests = count.get(GUESTS);
    return guests ? [{ key: GUESTS, label: t('showsGuests') + ' · THF Presents & Takeovers', count: guests }, ...opts] : opts;
  }, [programme, showOf, t]);

  const [showKey, setShowKey] = useState<string | null>(null);
  // ?show=<slug> (or "guests") from the URL, e.g. linked from a show page
  useEffect(() => {
    if (!programme) return;
    const param = new URLSearchParams(window.location.search).get('show');
    if (param) setShowKey(param === 'guests' ? GUESTS : param);
  }, [programme]);
  const pickShow = (key: string | null) => {
    setShowKey(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set('show', key === GUESTS ? 'guests' : key);
    else url.searchParams.delete('show');
    window.history.replaceState(null, '', url.toString());
  };

  const byShow = useMemo(() => (showKey ? all.filter((s) => showOf.get(s.id) === showKey) : all), [all, showKey, showOf]);
  const families = useMemo(() => genreFamilies(byShow), [byShow]);
  const [filter, setFilter] = useState<GenreFilter>(NO_GENRE_FILTER);
  const list = useMemo(() => applyGenreFilter(byShow, filter), [byShow, filter]);
  const [shown, setShown] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const filtered = isFiltered(filter) || !!showKey;

  // New search / genre → start at the top of the list again
  useEffect(() => setShown(pageSize), [filter, showKey, pageSize]);

  const more = list.length > shown;
  useEffect(() => {
    const el = sentinel.current;
    if (!autoLoad || !el || !more) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setShown((n) => n + pageSize), {
      rootMargin: '800px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad, more, list.length, pageSize, shown]);


  return (
    <div className='space-y-6 lg:space-y-8'>
      {showOptions.length > 0 && (
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <span className='font-mono text-xs uppercase tracking-wider text-white/50'>{t('archiveShow')}</span>
          <ShowPicker options={showOptions} value={showKey} onChange={pickShow} />
          {showKey && showKey !== GUESTS && (
            <Link
              href={`/shows/${showKey}`}
              className='inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/70 hover:text-white'
            >
              {t('archiveToShowPage')}
              <FiArrowRight className='h-3.5 w-3.5' aria-hidden />
            </Link>
          )}
        </div>
      )}

      {/* No counts anywhere: genre chips, tabs and the summary stay number-free */}
      <ArchiveFilterBar families={families} value={filter} onChange={setFilter} />

      {list.length ? (
        <ul
          role='list'
          className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5'
        >
          {list.slice(0, shown).map((s, i) => (
            <li key={s.id}>
              <ArchiveTile item={s} lazy={i >= 8} />
            </li>
          ))}
        </ul>
      ) : (
        <div className='rounded-xl border border-dashed border-white/20 px-6 py-16 text-center'>
          <p className='text-xl text-white'>{t('archiveNothingFound')}</p>
          <p className='mt-2 font-mono text-sm text-white/60'>{t('archiveNothingFoundText')}</p>
          {filtered && (
            <button
              type='button'
              onClick={() => {
                setFilter(NO_GENRE_FILTER);
                pickShow(null);
              }}
              className='mt-6 rounded-full border border-white px-5 py-2 font-mono text-sm text-white transition-colors hover:bg-white hover:text-dark-blue'
            >
              {t('archiveClear')}
            </button>
          )}
        </div>
      )}

      {fullArchiveHref && (
        <div className='flex justify-center pt-4'>
          <Link
            href={fullArchiveHref}
            className='group inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 font-sans font-bold text-dark-blue transition-colors duration-200 hover:bg-orange-500 hover:text-white'
          >
            {t('archiveBrowseAll')}
            <FiArrowRight className='h-5 w-5 transition-transform duration-200 group-hover:translate-x-1' aria-hidden />
          </Link>
        </div>
      )}

      {more && !fullArchiveHref && (
        <div ref={sentinel} className='flex flex-col items-center gap-2 pt-2'>
          {autoLoad ? (
            // Loads by itself when this comes into view
            <BarsSpinner color='#ff6314' />
          ) : (
            <button
              type='button'
              onClick={() => setShown((n) => n + pageSize)}
              className='rounded-full bg-white px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-dark-blue transition-colors duration-200 hover:bg-orange-500 hover:text-white'
            >
              {t('archiveLoadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
