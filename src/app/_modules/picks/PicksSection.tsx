'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import type { Picks } from '@/lib/picks';
import { CommunityPickCard, StaffPickPoster } from './PickCard';

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className='layout mb-4 lg:mb-6 flex items-end justify-between gap-6'>
      {/* div, not h2: the global h2 style would win over these classes */}
      <div role='heading' aria-level={2} className='font-sans font-bold text-2xl lg:text-3xl leading-none'>
        {title}
      </div>
      {children}
    </div>
  );
}

/** Sideways row with arrow buttons that appear once there's more to scroll. */
function useScroller() {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const by = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return { ref, edges, by };
}

const arrowClass =
  'h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-[colors,opacity] hover:bg-white hover:text-dark-blue disabled:pointer-events-none disabled:opacity-0';

/**
 * Top of the homepage: Staff Picks as wide posters in a swipe row, then the
 * Community Picks (a shuffled mix of the most-liked shows of the last three
 * months, no ranking or like counts) as cards like the archive.
 * Liking happens for logged-in members in thfradio.space only.
 */
export default function PicksSection({ picks }: { picks: Picks }) {
  const t = useTranslations();
  const { staff, community } = picks;
  const { ref, edges, by } = useScroller();
  if (!staff.length && !community.length) return null;

  const canScroll = !(edges.start && edges.end);

  return (
    <section className='bg-dark-blue text-white pt-8 lg:pt-12 pb-14 lg:pb-24' id='picks'>
      {staff.length > 0 && (
        // No heading: the shows speak for themselves; arrows sit on the row's edges
        <div className='relative'>
          {canScroll && (
            <>
              <button
                type='button'
                className={`${arrowClass} absolute left-3 lg:left-6 top-1/2 z-10 -translate-y-1/2 hidden md:flex`}
                onClick={() => by(-1)}
                disabled={edges.start}
                aria-label='←'
              >
                <FiArrowLeft className='h-5 w-5' />
              </button>
              <button
                type='button'
                className={`${arrowClass} absolute right-3 lg:right-6 top-1/2 z-10 -translate-y-1/2 hidden md:flex`}
                onClick={() => by(1)}
                disabled={edges.end}
                aria-label='→'
              >
                <FiArrowRight className='h-5 w-5' />
              </button>
            </>
          )}
          <ul
            ref={ref}
            className='flex gap-3 lg:gap-5 overflow-x-auto snap-x snap-mandatory px-6 lg:px-16 scroll-px-6 lg:scroll-px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            role='list'
          >
            {staff.map((pick) => (
              <li
                key={pick.trackId}
                className='snap-start shrink-0 w-[88%] sm:w-[calc((100%-0.75rem)/1.6)] lg:w-[calc((100%-1.25rem)/2)]'
              >
                <StaffPickPoster pick={pick} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {community.length > 0 && (
        <div className={staff.length > 0 ? 'mt-14 lg:mt-20' : ''}>
          <Heading title={t('communityPicks')} />
          <ul
            className='layout grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4'
            role='list'
          >
            {community.slice(0, 12).map((pick) => (
              <li key={pick.trackId} className='min-w-0'>
                <CommunityPickCard pick={pick} lazy />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
