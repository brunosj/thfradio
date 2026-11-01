'use client';

// Homepage video row: public YouTube videos as wide tiles (16:9 photo with a
// play button that is always visible, title, date), swiped sideways like the
// picks and merch. A click plays it in the small player next to the chat
// button (MiniVideoPlayer); the archive player and the live stream pause.
import { useLocale, useTranslations } from 'next-intl';
import { FiArrowUpRight } from 'react-icons/fi';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { pauseLiveStream } from '@/app/_lib/liveStreamAudio';
import { useGlobalStore } from '@/hooks/useStore';
import { YOUTUBE_CHANNEL_URL, type Video } from '@/lib/videos';
import { keepWithName } from '@/utils/titles';

const tileWidth = 'w-[85%] sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-2rem)/3)]';

function videoDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

function VideoTile({ video, onPlay }: { video: Video; onPlay: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <article className='group flex h-full flex-col border border-white/30 p-2 sm:p-2.5 lg:p-3 text-white transition-colors duration-300 hover:border-white'>
      <button
        type='button'
        onClick={onPlay}
        aria-label={`${t('videoPlay')}: ${video.title}`}
        className='relative block aspect-video w-full overflow-hidden bg-thf-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.image.url}
          alt=''
          loading='lazy'
          className={`absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
            video.imageSource === 'youtube' ? 'object-cover scale-[1.34]' : 'object-cover'
          }`}
        />
        <span className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent' />
        {/* Always visible: this one is a video */}
        <span className='absolute left-3 bottom-3 flex items-center gap-2'>
          <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-dark-blue shadow-lg transition-colors duration-300 group-hover:bg-orange-500 group-hover:text-white'>
            <Play className='h-5 w-5 translate-x-[1px]' fill='currentColor' />
          </span>
          <span className='bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white'>
            {t('videoLabel')}
          </span>
        </span>
      </button>
      <div className='pt-3 lg:pt-4 px-0.5'>
        {/* div, not h3: the global h3 style would win over these classes */}
        <div role='heading' aria-level={3} className='font-mono uppercase text-[13px] lg:text-[15px] leading-snug tracking-wide line-clamp-2'>
          {video.showSlug ? (
            <Link href={`/shows/${video.showSlug}`} className='hover:underline underline-offset-2'>
              {keepWithName(video.title)}
            </Link>
          ) : (
            keepWithName(video.title)
          )}
        </div>
        <p className='mt-1 font-mono uppercase text-[11px] lg:text-xs tracking-wide text-white/60'>{videoDate(video.airDate, locale)}</p>
      </div>
    </article>
  );
}

export default function VideosSection({ videos }: { videos: Video[] }) {
  const t = useTranslations();
  const requestPause = useGlobalStore((s) => s.requestPause);
  const setVideo = useGlobalStore((s) => s.setVideo);

  if (!videos.length) return null;

  const play = (video: Video) => {
    requestPause();
    void pauseLiveStream();
    setVideo(video);
  };

  return (
    // No top padding: the picks above already end with plenty of space
    <section className='bg-dark-blue text-white pb-4' id='videos'>
      <div className='layout mb-4 lg:mb-6 flex items-end justify-between gap-6'>
        {/* div, not h2: the global h2 style would win over these classes */}
        <div role='heading' aria-level={2} className='font-sans font-bold text-2xl lg:text-3xl leading-none'>
          {t('videosTitle')}
        </div>
        <a
          href={YOUTUBE_CHANNEL_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/70 hover:text-white'
        >
          YouTube
          <FiArrowUpRight className='h-3.5 w-3.5' aria-hidden />
        </a>
      </div>

      <ul
        role='list'
        className='flex gap-3 lg:gap-4 overflow-x-auto snap-x snap-mandatory px-6 lg:px-16 scroll-px-6 lg:scroll-px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {videos.map((video) => (
          <li key={video.youtubeId} className={`snap-start shrink-0 ${tileWidth}`}>
            <VideoTile video={video} onPlay={() => play(video)} />
          </li>
        ))}
      </ul>

    </section>
  );
}
