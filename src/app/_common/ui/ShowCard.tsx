'use client';

// One show as a card (archive, community picks, show pages): thin frame,
// square photo inset with a play button on top, title and date | length in
// mono caps, one line of outlined genre pills. Every card has the same
// format, so rows line up.
import { useState } from 'react';
import { Play } from '@/common/assets/PlayIcon';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { keepWithName } from '@/utils/titles';

export type ShowCardProps = {
  title: string;
  /** "24. Okt. 26 | 2h 59m" */
  meta: string;
  genres: string[];
  image: string | null;
  isCurrent: boolean;
  onPlay: () => void;
  playLabel: string;
  lazy?: boolean;
};

export default function ShowCard({
  title,
  meta,
  genres,
  image,
  isCurrent,
  onPlay,
  playLabel,
  lazy = true,
}: ShowCardProps) {
  const [broken, setBroken] = useState(false);
  const src = broken ? null : image;

  return (
    <article
      className={`group flex h-full flex-col border p-2 sm:p-2.5 lg:p-3 text-white transition-colors duration-300
        ${isCurrent ? 'border-orange-500' : 'border-white/30 hover:border-white'}`}
    >
      <div className='relative aspect-square overflow-hidden bg-thf-blue-900'>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=''
            loading={lazy ? 'lazy' : undefined}
            decoding='async'
            onError={() => setBroken(true)}
            className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-thf-blue-500 to-thf-blue-900 p-4 text-center'>
            <span className='font-mono uppercase text-sm leading-snug text-white/90 line-clamp-3'>{keepWithName(title)}</span>
          </div>
        )}
        <button
          type='button'
          onClick={onPlay}
          aria-label={playLabel}
          aria-pressed={isCurrent}
          className={`absolute inset-0 flex items-center justify-center transition-colors duration-300 focus-visible:outline-none
            ${isCurrent ? 'bg-black/30' : 'bg-black/0 hover:bg-black/25 focus-visible:bg-black/25'}`}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300
              ${
                isCurrent
                  ? 'bg-orange-500 opacity-100 scale-100'
                  : 'bg-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100'
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
        </button>
      </div>

      <div className='flex flex-1 flex-col pt-3 lg:pt-4 px-0.5'>
        {/* div, not h3: the global h3 style would win over these classes */}
        <div
          role='heading'
          aria-level={3}
          className='font-mono uppercase text-[13px] lg:text-[15px] leading-snug tracking-wide line-clamp-2'
          title={title}
        >
          {keepWithName(title)}
        </div>
        {meta && (
          <p className='mt-1 truncate font-mono uppercase text-[11px] lg:text-xs tracking-wide text-white/60'>{meta}</p>
        )}

        {genres.length > 0 && (
          <div
            className='mt-auto pt-4 flex min-w-0 gap-1 overflow-hidden'
            style={{
              maskImage: 'linear-gradient(to right, black 80%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent)',
            }}
          >
            {genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className='shrink-0 whitespace-nowrap rounded-full border border-white/70 px-2 py-0.5 font-mono uppercase text-[10px] tracking-wide text-white'
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
