'use client';

// "All shows ▾" picker for the archive: searchable list of the shows that
// have recordings (Guests = THF Presents nights and takeovers first), each
// with its episode count.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';

export type ShowOption = { key: string; label: string; count: number };

export default function ShowPicker({
  options,
  value,
  onChange,
}: {
  options: ShowOption[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.key === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  const pick = (key: string | null) => {
    onChange(key);
    setOpen(false);
    setQ('');
  };

  return (
    <div ref={ref} className='relative'>
      <div className='flex items-center gap-1'>
        <button
          type='button'
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup='listbox'
          className={`inline-flex max-w-[70vw] sm:max-w-xs items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
            selected ? 'border-white bg-white text-dark-blue' : 'border-white/25 text-white/85 hover:border-white/70 hover:text-white'
          }`}
        >
          <span className='truncate'>{selected ? selected.label : t('archiveAllShows')}</span>
          <FaChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {selected && (
          <button
            type='button'
            onClick={() => pick(null)}
            aria-label={t('archiveClear')}
            className='flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white'
          >
            <FaTimes className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {open && (
        <div className='absolute left-0 top-full z-40 mt-2 w-[min(22rem,85vw)] overflow-hidden rounded-xl border border-white/15 bg-dark-blue shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]'>
          <label className='relative block border-b border-white/10'>
            <FaSearch className='absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40' aria-hidden />
            <input
              autoFocus
              type='search'
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('archiveSearchShows')}
              className='w-full bg-transparent py-3 pl-10 pr-4 font-mono text-sm text-white placeholder:text-white/40 focus:outline-none'
            />
          </label>
          <ul role='listbox' className='max-h-80 overflow-y-auto py-1'>
            <li>
              <button
                type='button'
                onClick={() => pick(null)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left font-mono text-sm hover:bg-white/10 ${!value ? 'text-orange-400' : 'text-white'}`}
              >
                {t('archiveAllShows')}
              </button>
            </li>
            {shown.map((o) => (
              <li key={o.key}>
                <button
                  type='button'
                  role='option'
                  aria-selected={o.key === value}
                  onClick={() => pick(o.key)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left font-mono text-sm hover:bg-white/10 ${
                    o.key === value ? 'text-orange-400' : 'text-white'
                  }`}
                >
                  <span className='truncate'>{o.label}</span>
                  <span className='shrink-0 tabular-nums text-xs opacity-50'>{o.count.toLocaleString(locale)}</span>
                </button>
              </li>
            ))}
            {!shown.length && <li className='px-4 py-3 font-mono text-sm text-white/50'>{t('archiveNothingFound')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
