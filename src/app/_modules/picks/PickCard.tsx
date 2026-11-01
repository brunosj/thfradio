'use client';

// Staff Picks as big square posters: full-bleed photo, date on a dark box,
// title on white boxes in caps, length and outlined genre pills underneath.
// Community Picks as cards like the archive (ShowCard). Click plays the show
// in the site's SoundCloud player.
import { useLocale, useTranslations } from 'next-intl';
import { Play } from '@/common/assets/PlayIcon';
import BarsSpinner from '@/common/ui/BarsSpinner';
import ShowCard from '@/common/ui/ShowCard';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import type { Pick } from '@/lib/picks';
import { keepWithName } from '@/utils/titles';
import { formatDuration } from '@/utils/showUtils';

/** Berlin date: poster "FR 23.10.26", card "23. Okt. 26" */
function pickDate(iso: string, locale: string, style: 'poster' | 'card'): string {
  const lang = locale === 'de' ? 'de-DE' : 'en-GB';
  const d = new Date(iso);
  if (style === 'card') {
    return d.toLocaleDateString(lang, { timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: '2-digit' });
  }
  const weekday = d.toLocaleDateString(lang, { timeZone: 'Europe/Berlin', weekday: 'short' }).replace('.', '');
  const date = d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: '2-digit' });
  return `${weekday} ${date}`;
}


function usePickPlayer(pick: Pick) {
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const trackId = useGlobalStore((s) => s.trackId);
  const trackIdSet = useGlobalStore((s) => s.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((s) => s.setCurrentShowUrl);

  const isCurrent = activePlayer === ActivePlayer.SOUNDCLOUD && trackId === pick.trackId;
  const play = () => {
    trackIdSet(pick.trackId);
    setCurrentShowUrl(pick.soundcloudUrl);
  };
  return { isCurrent, play };
}

export function StaffPickPoster({ pick }: { pick: Pick }) {
  const t = useTranslations();
  const locale = useLocale();
  const { isCurrent, play } = usePickPlayer(pick);
  const src = pick.image.originalUrl || pick.image.squareUrl;
  const duration = formatDuration(pick.durationSec);

  return (
    <button
      type='button'
      onClick={play}
      aria-label={`${t('playShow')}: ${pick.title}`}
      aria-pressed={isCurrent}
      className={`group relative block w-full aspect-square overflow-hidden bg-thf-blue-900 text-left [container-type:inline-size]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${isCurrent ? 'ring-2 ring-orange-500' : ''}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=''
          className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]'
        />
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-thf-blue-500 to-thf-blue-900' />
      )}

      {/* Dark fade under the text so it reads on bright photos */}
      <div className='absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent' />

      <span
        aria-hidden
        className={`absolute right-[4cqw] top-[4cqw] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300
          ${
            isCurrent
              ? 'bg-orange-500 opacity-100'
              : 'bg-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100'
          }`}
      >
        {isCurrent ? (
          <span className='scale-50'>
            <BarsSpinner color='#ffffff' />
          </span>
        ) : (
          <Play className='h-6 w-6 translate-x-[1px]' fill='#100f2e' />
        )}
      </span>

      <div className='absolute inset-x-0 bottom-0 p-[4cqw]'>
        <p
          className='inline-block bg-black px-[1.2cqw] py-[0.3cqw] font-sans font-bold uppercase leading-none text-white'
          style={{ fontSize: 'clamp(14px, 3.4cqw, 26px)' }}
        >
          {pickDate(pick.airDate, locale, 'poster')}
        </p>
        {/* div, not h3: the global h3 style would win over these classes */}
        <div
          role='heading'
          aria-level={3}
          className='mt-[0.6cqw] line-clamp-3 font-sans font-bold uppercase text-black'
          style={{ fontSize: 'clamp(20px, 5.6cqw, 52px)', lineHeight: 1.3 }}
        >
          {/* One white box per line */}
          <span className='bg-white px-[1.2cqw] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]'>
            {keepWithName(pick.title)}
          </span>
        </div>
        {duration && (
          <p className='mt-[2cqw] font-mono text-white' style={{ fontSize: 'clamp(13px, 2.8cqw, 22px)' }}>
            {duration}
          </p>
        )}
        {pick.genres.length > 0 && (
          <div className='mt-[2cqw] flex flex-wrap gap-1.5'>
            {pick.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className='whitespace-nowrap rounded-full border border-white px-3 py-1 font-mono uppercase text-white'
                style={{ fontSize: 'clamp(11px, 2.2cqw, 16px)' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function CommunityPickCard({ pick, lazy }: { pick: Pick; lazy?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { isCurrent, play } = usePickPlayer(pick);
  const meta = [pickDate(pick.airDate, locale, 'card'), formatDuration(pick.durationSec)]
    .filter(Boolean)
    .join(' | ');
  return (
    <ShowCard
      title={pick.title}
      meta={meta}
      genres={pick.genres}
      image={pick.image.squareUrl || pick.image.originalUrl || null}
      isCurrent={isCurrent}
      onPlay={play}
      playLabel={`${t('playShow')}: ${pick.title}`}
      lazy={lazy}
    />
  );
}
