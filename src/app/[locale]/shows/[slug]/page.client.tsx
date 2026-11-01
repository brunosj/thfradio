'use client';

// Show page: the wide header photo as a banner (if there is one), then a
// compact block: square show photo, title on white boxes (like the staff
// picks), status, slot / next date, "play latest", links, genres and the
// description. Below, every episode from the archive in the card grid.
import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { useLocale, useTranslations } from 'next-intl';
import { AiOutlineInstagram } from 'react-icons/ai';
import { CiMail } from 'react-icons/ci';
import { FiArrowLeft } from 'react-icons/fi';
import { SlGlobe, SlSocialSoundcloud, SlSocialSpotify, SlSocialTwitter } from 'react-icons/sl';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useData } from '@/context/DataContext';
import CloudShowChild from '@/modules/archive/CloudShowChild';
import { useCalendarData } from '@/hooks/useCalendarStore';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import { CMS_URL } from '@/utils/constants';
import { getMixcloudKey } from '@/utils/getMixcloudKey';
import { compactTitle, showMatcher } from '@/utils/guests';
import { formatShowDate, getShowGenres, getShowName, processShows } from '@/utils/showUtils';
import type { ShowTypes } from '@/types/ResponsesInterface';
import { keepWithName } from '@/utils/titles';

/** A recording this recent (or a slot on the schedule) makes the show current. */
const CURRENT_DAYS = 120;

function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path.replace(/^http:\/\//, 'https://');
  if (path.startsWith('/')) return `${CMS_URL}${path}`;
  return `${CMS_URL}/uploads/${path}`;
}

/** "@handle" or "instagram.com/handle" → full URL */
function instagramUrl(v: string): string {
  if (/^https?:\/\//.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//, '')}`;
}
const httpUrl = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

const DAYS_DE: Record<string, string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};
const FREQ_DE: Record<string, string> = {
  'bi-weekly': 'Zweiwöchentlich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  'bi-monthly': 'Zweimonatlich',
  occasionally: 'Gelegentlich',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Mittwoch 18:00–20:00 · Monatlich" from the show's slot fields, if set. */
function slotLine(show: ShowTypes, locale: string): string {
  const day = show.day ? (locale === 'de' ? DAYS_DE[show.day.toLowerCase()] ?? show.day : cap(show.day)) : '';
  const time = show.startTime ? `${show.startTime.slice(0, 5)}${show.endTime ? `–${show.endTime.slice(0, 5)}` : ''}` : '';
  const freqRaw = (show.frequency || show.rrule || '').trim();
  const freq = freqRaw ? (locale === 'de' ? FREQ_DE[freqRaw.toLowerCase()] ?? freqRaw : cap(freqRaw)) : '';
  return [[day, time].filter(Boolean).join(' '), freq].filter(Boolean).join(' · ');
}

function SocialLinks({ show }: { show: ShowTypes }) {
  const links = [
    show.instagram && { href: instagramUrl(show.instagram), icon: AiOutlineInstagram, label: 'Instagram' },
    show.soundcloud && { href: httpUrl(show.soundcloud), icon: SlSocialSoundcloud, label: 'SoundCloud' },
    show.spotify && { href: httpUrl(show.spotify), icon: SlSocialSpotify, label: 'Spotify' },
    (show.twitterx || show.twitter) && { href: httpUrl((show.twitterx || show.twitter)!), icon: SlSocialTwitter, label: 'X' },
    show.website && { href: httpUrl(show.website), icon: SlGlobe, label: 'Website' },
    show.mail && { href: `mailto:${show.mail}`, icon: CiMail, label: 'Mail' },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];
  if (!links.length) return null;
  return (
    <div className='flex gap-2'>
      {links.map(({ href, icon: Icon, label }) => (
        <a
          key={label}
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={label}
          title={label}
          className='flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white hover:text-dark-blue'
        >
          <Icon className='h-5 w-5' />
        </a>
      ))}
    </div>
  );
}

export default function ShowContent({
  content,
  programme = [],
}: {
  content: ShowTypes;
  /** All programme shows (slug + title), for matching episodes to shows */
  programme?: { slug: string; title: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  // The archive loads with the DataProvider on every page.
  const { cloudShows, isLoadingShows } = useData();
  const { ch1, ch2 } = useCalendarData();
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const currentShowUrl = useGlobalStore((s) => s.currentShowUrl);
  const showKeySet = useGlobalStore((s) => s.showKeySet);
  const trackIdSet = useGlobalStore((s) => s.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((s) => s.setCurrentShowUrl);

  const key = compactTitle(content.keyword || content.title || '');

  // Episodes: archive recordings whose title (without the date) starts with the show name.
  const episodes = useMemo(() => {
    if (!cloudShows || key.length < 3) return [];
    // Longest show name wins ("Tina" doesn't get "Tina & Friends" episodes);
    // without the show list, fall back to the name prefix.
    const hasSelf = programme.some((p) => p.slug === content.slug);
    const match = hasSelf ? showMatcher(programme) : null;
    const mine = cloudShows.filter((r) => {
      const title = getShowName(r) || r.name || '';
      return match ? match(title) === content.slug : compactTitle(title).startsWith(key);
    });
    return processShows(mine);
  }, [cloudShows, key, programme, content.slug]);

  const genres = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of episodes) for (const g of getShowGenres(e)) count.set(g, (count.get(g) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  }, [episodes]);

  const nextDate = useMemo(() => {
    const now = Date.now();
    let next: Date | null = null;
    for (const e of [...ch1, ...ch2]) {
      const s = e.startTime ?? e.start;
      const end = e.endTime ?? e.end;
      if (!s || !end || parseISO(end).getTime() < now) continue;
      const hit = e.showSlug === content.slug || (key.length >= 3 && compactTitle(e.showTitle || e.summary || e.title || '').startsWith(key));
      if (!hit) continue;
      const start = parseISO(s);
      if (!next || start < next) next = start;
    }
    return next;
  }, [ch1, ch2, content.slug, key]);

  const latest = episodes[0];
  const current =
    !!nextDate || (!!latest && latest.date.getTime() >= Date.now() - CURRENT_DAYS * 86400_000);
  const slot = slotLine(content, locale);
  const banner = imageUrl(content.imageFullWidth);
  const square = imageUrl(content.image) ?? banner;
  const backdrop = banner ?? square;

  const latestIsPlaying =
    !!latest &&
    currentShowUrl === latest.url &&
    activePlayer === (latest.platform === 'mixcloud' ? ActivePlayer.MIXCLOUD : ActivePlayer.SOUNDCLOUD);
  const playLatest = () => {
    if (!latest) return;
    if (latest.platform === 'mixcloud') showKeySet(getMixcloudKey(latest.url));
    else if (latest.key) trackIdSet(latest.key);
    setCurrentShowUrl(latest.url);
  };

  const nextLabel = nextDate
    ? `${t('showNextOnAir')}: ${nextDate.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Berlin',
      })} ${nextDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`
    : '';

  return (
    <div className='bg-dark-blue text-white'>
      {/* Hero: wide header photo (if the show has one), then a compact info block */}
      <section className='relative overflow-hidden'>
        {banner ? (
          <div className='relative h-[34vh] min-h-56 lg:h-[46vh] w-full'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt='' className='absolute inset-0 h-full w-full object-cover' />
            <div className='absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-dark-blue' />
          </div>
        ) : (
          backdrop && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backdrop} alt='' aria-hidden className='absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-40' />
              <div className='absolute inset-0 bg-gradient-to-b from-dark-blue/40 via-dark-blue/70 to-dark-blue' />
            </>
          )
        )}

        <Link
          href='/shows'
          className={`absolute left-6 lg:left-16 top-5 lg:top-7 z-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider ${
            banner ? 'rounded-full bg-black/50 px-3 py-1.5 text-white backdrop-blur-sm hover:bg-black/70' : 'text-white/70 hover:text-white'
          }`}
        >
          <FiArrowLeft className='h-4 w-4' aria-hidden />
          {t('showBackToShows')}
        </Link>

        <div className={`relative layout pb-10 lg:pb-14 ${banner ? '-mt-20 lg:-mt-28' : 'pt-16 lg:pt-20'}`}>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7 lg:gap-9'>
            <div className='relative aspect-square w-32 sm:w-44 lg:w-56 shrink-0 overflow-hidden bg-thf-blue-900 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]'>
              {square ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={square} alt={content.title} className='absolute inset-0 h-full w-full object-cover' />
              ) : (
                <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-thf-blue-500 to-thf-blue-900 p-4 text-center'>
                  <span className='font-bold uppercase text-lg'>{content.title}</span>
                </div>
              )}
            </div>

            <div className='min-w-0 flex-1 [container-type:inline-size]'>
              <p className='inline-block bg-black px-2 py-1 font-sans font-bold uppercase leading-none text-white text-xs lg:text-sm'>
                {current ? t('showsCurrent') : t('showsArchiveShow')}
              </p>
              {/* div, not h1: the global h1 style would win over these classes */}
              <div
                role='heading'
                aria-level={1}
                className='mt-1.5 font-sans font-bold uppercase text-black'
                style={{ fontSize: 'clamp(26px, 5.5cqw, 52px)', lineHeight: 1.25 }}
              >
                <span className='bg-white px-[0.18em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]'>
                  {keepWithName(content.title)}
                </span>
              </div>
              {(slot || nextLabel) && (
                <p className='mt-3 font-mono text-xs lg:text-sm text-white'>{[slot, nextLabel].filter(Boolean).join('  |  ')}</p>
              )}
            </div>
          </div>

          {/* Hidden when there's nothing to show, so no empty gap */}
          <div className='mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 empty:hidden'>
            {latest && (
              <button
                type='button'
                onClick={playLatest}
                className={`group inline-flex items-center gap-2.5 rounded-full py-2 pl-2 pr-5 font-sans font-bold text-sm transition-colors
                  ${latestIsPlaying ? 'bg-orange-500 text-white' : 'bg-white text-dark-blue hover:bg-orange-500 hover:text-white'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${latestIsPlaying ? 'bg-white/20' : 'bg-dark-blue'}`}>
                  {latestIsPlaying ? (
                    <span className='scale-[0.32]'>
                      <BarsSpinner color='#ffffff' />
                    </span>
                  ) : (
                    <Play className='h-3.5 w-3.5 translate-x-[1px]' fill='#ffffff' />
                  )}
                </span>
                {t('showPlayLatest')}
                <span className='font-mono text-xs font-normal opacity-70'>{formatShowDate(latest.date, locale)}</span>
              </button>
            )}
            <SocialLinks show={content} />
            {genres.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {genres.map((g) => (
                  <span
                    key={g}
                    className='whitespace-nowrap rounded-full border border-white/80 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-white'
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {content.description && (
            <div className='mt-6 max-w-3xl font-mono text-[13px] lg:text-sm leading-relaxed text-white/80 markdown [&_p]:mb-3'>
              <ReactMarkdown components={{ a: (props) => <a {...props} target='_blank' rel='noopener noreferrer' /> }}>
                {content.description}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </section>

      {/* Episodes */}
      <section className='layout pb-16 lg:pb-24'>
        <div className='mb-5 lg:mb-7 flex items-baseline gap-3 border-t border-white/15 pt-7 lg:pt-9'>
          <div role='heading' aria-level={2} className='font-sans font-bold text-2xl lg:text-3xl leading-none'>
            {t('showEpisodes')}
          </div>
          {episodes.length > 0 && <span className='font-mono text-sm text-white/50'>{episodes.length}</span>}
        </div>

        {isLoadingShows && !cloudShows ? (
          <div className='flex justify-center py-12'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : episodes.length ? (
          <ul role='list' className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5'>
            {episodes.map((item) => (
              <CloudShowChild key={item.url} item={item} />
            ))}
          </ul>
        ) : (
          <p className='py-10 font-mono text-sm text-white/60'>{t('showNoEpisodes')}</p>
        )}
      </section>
    </div>
  );
}
