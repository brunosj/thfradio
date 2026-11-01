'use client';

// Search + genre family chips with subgenre fold-outs (after NTS Explore),
// as on the intranet's Latest Shows / Community Picks (PickFilters.tsx).
// Picking a family filters to it and folds out its subgenres (the actual
// genres of the shows in that family) to narrow down further; picking the
// family again closes it. Several families can be open at once (OR).
import { Fragment, type MouseEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import {
  NO_GENRE_FILTER,
  familyLabel,
  isFiltered,
  toggleFamily,
  toggleSub,
  type FamilyCount,
  type GenreFilter,
} from '@/utils/genres';

function Chip({
  active,
  onClick,
  children,
  size = 'md',
  expanded,
  tone = 'family',
}: {
  active: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  size?: 'md' | 'sm';
  expanded?: boolean;
  tone?: 'family' | 'sub';
}) {
  const on =
    tone === 'family'
      ? 'border-white bg-white text-dark-blue'
      : 'border-orange-500 bg-orange-500 text-white';
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={expanded}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-mono transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
        size === 'md' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      } ${active ? on : 'border-white/25 bg-transparent text-white/85 hover:border-white/70 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function Foldout({
  family,
  value,
  onChange,
  className = '',
  showTitle,
}: {
  family: FamilyCount;
  value: GenreFilter;
  onChange: (f: GenreFilter) => void;
  className?: string;
  /** Name the family (mobile, where the panel sits under the whole row) */
  showTitle?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div
      role='group'
      aria-label={t('archiveSubgenres', { family: familyLabel(family, locale) })}
      className={`basis-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 ${className}`}
    >
      {showTitle && (
        <p className='mb-2 font-mono text-[11px] uppercase tracking-wider text-white/50'>{familyLabel(family, locale)}</p>
      )}
      <div className='flex flex-wrap gap-1.5'>
        {family.subs.map((s) => (
          <Chip
            key={s.key}
            size='sm'
            tone='sub'
            active={value.subs.includes(s.key)}
            onClick={() => onChange(toggleSub(value, s.key))}
          >
            {s.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function ArchiveFilterBar({
  families,
  value,
  onChange,
  summary,
}: {
  families: FamilyCount[];
  value: GenreFilter;
  onChange: (f: GenreFilter) => void;
  /** e.g. "212 shows of 1,804", shown next to the search */
  summary?: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale();
  // Only families with more than one subgenre fold out
  const open = families.filter((f) => value.families.includes(f.id) && f.subs.length > 1);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <label className='relative block flex-1 sm:max-w-md'>
          <span className='sr-only'>{t('archiveSearchPlaceholder')}</span>
          <FaSearch className='pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50' aria-hidden />
          <input
            type='search'
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder={t('archiveSearchPlaceholder')}
            className='w-full rounded-full border border-white/20 bg-white/[0.07] py-2.5 pl-10 pr-4 font-mono text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-white/60 focus:bg-white/10'
          />
        </label>
        {summary && <p className='font-mono text-xs text-white/60 sm:ml-auto'>{summary}</p>}
      </div>

      {families.length > 0 && (
        <>
          {/* Mobile: one row that scrolls sideways; from sm: chips wrap and
              subgenres open right under their family (full-width row) */}
          <div
            role='group'
            aria-label={t('archiveGenres')}
            className='-mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0'
          >
            {families.map((f) => {
              const active = value.families.includes(f.id);
              const foldable = f.subs.length > 1;
              return (
                <Fragment key={f.id}>
                  <Chip
                    active={active}
                    onClick={(e) => {
                      // Mobile: keep the picked chip in view in the sideways row
                      e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                      onChange(toggleFamily(value, f.id));
                    }}
                    expanded={foldable ? active : undefined}
                  >
                    {familyLabel(f, locale)}
                    {foldable && (
                      <FaChevronDown
                        aria-hidden
                        className={`h-2.5 w-2.5 transition-transform duration-200 ${active ? 'rotate-180' : ''}`}
                      />
                    )}
                  </Chip>
                  {active && foldable && (
                    <Foldout family={f} value={value} onChange={onChange} className='hidden sm:block' />
                  )}
                </Fragment>
              );
            })}
            {isFiltered(value) && (
              <button
                type='button'
                onClick={() => onChange(NO_GENRE_FILTER)}
                className='inline-flex shrink-0 items-center gap-1.5 px-2 py-1.5 font-mono text-sm text-white/60 underline-offset-4 hover:text-white hover:underline'
              >
                <FaTimes className='h-3 w-3' aria-hidden />
                {t('archiveClear')}
              </button>
            )}
          </div>

          {/* Mobile: the open families' subgenres under the scrolling row */}
          {open.length > 0 && (
            <div className='space-y-2 sm:hidden'>
              {open.map((f) => (
                <Foldout key={f.id} family={f} value={value} onChange={onChange} showTitle />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
