'use client';

// Archive player: our own bar at the bottom of every page (cover, title,
// play / pause, progress you can click, link to the source, close). The
// SoundCloud / Mixcloud widget plays the audio in a hidden iframe and is
// driven through their official widget APIs.
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowUpRight, FiX } from 'react-icons/fi';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { showMatcher } from '@/utils/guests';
import { useData } from '@/context/DataContext';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import type { MixcloudWidget } from '@/types/mixcloud';
import type { SoundcloudWidget } from '@/types/soundcloud';

/** Height of the bar; the chat button and the page bottom make room for it. */
export const PLAYER_BAR_HEIGHT = 64;

const fmt = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** "Show Name // 22.10.26" → "Show Name" */
const cleanTitle = (t: string) => t.split('//')[0].trim();

export default function CloudPlayer() {
  const t = useTranslations();
  const showKey = useGlobalStore((s) => s.showKey);
  const trackId = useGlobalStore((s) => s.trackId);
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const currentShowUrl = useGlobalStore((s) => s.currentShowUrl);
  const resetPlayer = useGlobalStore((s) => s.resetPlayer);
  const { cloudShows } = useData();

  const [scReady, setScReady] = useState(false);
  const [mcReady, setMcReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const positionRef = useRef(0);
  /** The browser blocked starting the hidden widget (iOS): show it so people can tap play */
  const [needsTap, setNeedsTap] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  /** Slider position while dragging (seconds), applied on release */
  const [scrub, setScrub] = useState<number | null>(null);
  const [scMeta, setScMeta] = useState<{ title?: string; image?: string | null; url?: string } | null>(null);

  const scRef = useRef<SoundcloudWidget | null>(null);
  const mcRef = useRef<MixcloudWidget | null>(null);

  const isSoundcloud = activePlayer === ActivePlayer.SOUNDCLOUD && !!trackId;
  const isMixcloud = activePlayer === ActivePlayer.MIXCLOUD && !!showKey;
  const visible = isSoundcloud || isMixcloud;

  // Title + cover from the archive (fallback: what the SoundCloud widget says)
  const fromArchive = useMemo(() => {
    if (!cloudShows || !currentShowUrl) return null;
    const show = cloudShows.find((s) => s.url === currentShowUrl);
    if (!show) return null;
    return { title: cleanTitle(show.name || ''), image: show.pictures?.extra_large || show.picture || null };
  }, [cloudShows, currentShowUrl]);
  const title = fromArchive?.title || (scMeta?.title ? cleanTitle(scMeta.title) : '') || '…';
  const image = fromArchive?.image || scMeta?.image || null;
  const sourceUrl = currentShowUrl || scMeta?.url || '';

  // Show page of what's playing (cover + title link there); loaded once
  const [programme, setProgramme] = useState<{ slug: string; title: string }[] | null>(null);
  useEffect(() => {
    if (!visible || programme) return;
    fetch('/api/programme-shows')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setProgramme(Array.isArray(list) ? list : []))
      .catch(() => setProgramme([]));
  }, [visible, programme]);
  const showSlug = useMemo(
    () => (programme?.length && title !== '…' ? showMatcher(programme)(title) : null),
    [programme, title],
  );
  const showHref = showSlug ? `/shows/${showSlug}` : null;

  useEffect(() => {
    playingRef.current = playing;
    if (playing) setNeedsTap(false);
  }, [playing]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Tell the chat button to make room while the tap-to-start strip is open
  const setPlayerTapNeeded = useGlobalStore((s) => s.setPlayerTapNeeded);
  useEffect(() => setPlayerTapNeeded(needsTap), [needsTap, setPlayerTapNeeded]);

  // If nothing plays a few seconds after we asked, the browser blocked it
  const expectPlayback = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (!playingRef.current && positionRef.current < 0.5) setNeedsTap(true);
    }, 4000);
  };
  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  // New track → reset the bar
  useEffect(() => {
    setNeedsTap(false);
    setPlaying(false);
    setPosition(0);
    setDuration(0);
    setScMeta(null);
  }, [trackId, showKey, activePlayer]);

  // Something else wants the sound (a video): pause, keep the bar
  const pauseSignal = useGlobalStore((s) => s.pauseSignal);
  useEffect(() => {
    if (!pauseSignal) return;
    scRef.current?.pause();
    void mcRef.current?.pause();
  }, [pauseSignal]);

  // Stop the widget that isn't active
  useEffect(() => {
    if (!isSoundcloud && scRef.current) {
      scRef.current.pause();
      scRef.current = null;
    }
    if (!isMixcloud && mcRef.current) {
      void mcRef.current.pause();
      mcRef.current = null;
    }
  }, [isSoundcloud, isMixcloud]);

  const onSoundcloudLoad = (iframe: HTMLIFrameElement) => {
    if (!window.SC) return;
    const w = window.SC.Widget(iframe);
    scRef.current = w;
    w.bind('ready', () => {
      w.getDuration((ms) => setDuration(ms / 1000));
      w.getCurrentSound((s) =>
        setScMeta(s ? { title: s.title, image: s.artwork_url?.replace('-large', '-t200x200') ?? null, url: s.permalink_url } : null),
      );
      w.play();
      expectPlayback();
    });
    w.bind('play', () => setPlaying(true));
    w.bind('pause', () => setPlaying(false));
    w.bind('finish', () => setPlaying(false));
    // Progress also means it's playing: the 'play' event can come before we listen
    w.bind('playProgress', (e) => {
      const ms = e?.currentPosition ?? 0;
      setPosition(ms / 1000);
      // Only real progress counts (a blocked widget still reports 0:00)
      if (ms > 500 && !playingRef.current) setPlaying(true);
    });
  };

  const onMixcloudLoad = async (iframe: HTMLIFrameElement) => {
    if (!window.Mixcloud) return;
    try {
      const w = window.Mixcloud.PlayerWidget(iframe);
      await w.ready;
      mcRef.current = w;
      w.events.play.on(() => setPlaying(true));
      w.events.pause.on(() => setPlaying(false));
      w.events.ended.on(() => setPlaying(false));
      w.events.progress.on((pos, dur) => {
        setPosition(pos);
        if (dur) setDuration(dur);
        if (pos > 0.5 && !playingRef.current) setPlaying(true);
      });
      setDuration(await w.getDuration());
      expectPlayback();
      await w.play();
    } catch (error) {
      console.error('Mixcloud widget error:', error);
    }
  };

  const toggle = () => {
    if (isSoundcloud) scRef.current?.toggle();
    else if (isMixcloud) void mcRef.current?.togglePlay();
  };

  const seekTo = (seconds: number) => {
    if (!duration) return;
    const sec = Math.max(0, Math.min(duration - 1, seconds));
    setPosition(sec);
    if (isSoundcloud) scRef.current?.seekTo(sec * 1000);
    else if (isMixcloud) void mcRef.current?.seek(sec);
  };
  const skip = (delta: number) => seekTo(position + delta);
  const commitScrub = () => {
    if (scrub !== null) seekTo(scrub);
    setScrub(null);
  };

  const close = () => {
    scRef.current?.pause();
    void mcRef.current?.pause();
    scRef.current = null;
    mcRef.current = null;
    resetPlayer();
  };

  const origin = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin);
  const shownPos = scrub ?? position;
  const progress = duration ? Math.min(100, (shownPos / duration) * 100) : 0;

  return (
    <>
      <Script src='https://widget.mixcloud.com/media/js/widgetApi.js' strategy='afterInteractive' onLoad={() => setMcReady(true)} onReady={() => setMcReady(true)} />
      <Script src='https://w.soundcloud.com/player/api.js' strategy='afterInteractive' onLoad={() => setScReady(true)} onReady={() => setScReady(true)} />

      {visible && (
        <>
          {/* Keeps the page bottom (footer) clear of the bar */}
          <div aria-hidden style={{ height: PLAYER_BAR_HEIGHT }} />

          <div
            role='region'
            aria-label={t('playerLabel')}
            className='fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-dark-blue/95 text-white backdrop-blur-md'
            style={{ height: PLAYER_BAR_HEIGHT }}
          >
            <div className='layout flex h-full items-center gap-3 lg:gap-4'>
              {(() => {
                const cover = image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt='' className='h-11 w-11 object-cover transition-opacity group-hover:opacity-80' />
                ) : (
                  <span className='block h-11 w-11 bg-gradient-to-br from-thf-blue-500 to-thf-blue-900' />
                );
                // Cover → show page (or the recording at the source, e.g. guests)
                return showHref ? (
                  <Link href={showHref} className='group hidden sm:block shrink-0' title={t('playerToShow')} aria-label={t('playerToShow')}>
                    {cover}
                  </Link>
                ) : sourceUrl ? (
                  <a href={sourceUrl} target='_blank' rel='noopener noreferrer' className='group hidden sm:block shrink-0' aria-label={isMixcloud ? 'Mixcloud' : 'SoundCloud'}>
                    {cover}
                  </a>
                ) : (
                  <span className='hidden sm:block shrink-0'>{cover}</span>
                );
              })()}

              <button
                type='button'
                onClick={() => skip(-15)}
                aria-label={t('playerBack')}
                title={t('playerBack')}
                className='hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11px] text-white/75 transition-colors hover:bg-white/10 hover:text-white'
              >
                −15
              </button>
              <button
                type='button'
                onClick={toggle}
                aria-label={playing ? t('playerPause') : t('playerPlay')}
                className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-dark-blue transition-colors hover:bg-orange-500 hover:text-white'
              >
                {playing ? (
                  <span aria-hidden className='flex gap-[3px]'>
                    <span className='h-3.5 w-[3px] bg-current' />
                    <span className='h-3.5 w-[3px] bg-current' />
                  </span>
                ) : (
                  <Play className='h-4 w-4 translate-x-[1px]' fill='currentColor' />
                )}
              </button>
              <button
                type='button'
                onClick={() => skip(30)}
                aria-label={t('playerForward')}
                title={t('playerForward')}
                className='hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11px] text-white/75 transition-colors hover:bg-white/10 hover:text-white'
              >
                +30
              </button>

              <div className='min-w-0 flex-1'>
                {showHref ? (
                  <Link
                    href={showHref}
                    className='block truncate font-mono text-[12px] lg:text-[13px] uppercase tracking-wide leading-tight hover:underline underline-offset-2'
                    title={title}
                  >
                    {title}
                  </Link>
                ) : (
                  <p className='truncate font-mono text-[12px] lg:text-[13px] uppercase tracking-wide leading-tight' title={title}>
                    {title}
                  </p>
                )}
                {/* Slider: drag or click to jump; applied on release */}
                <div className='mt-1.5 flex items-center gap-2.5'>
                  <span className='w-12 shrink-0 font-mono text-[11px] tabular-nums text-white/60'>{fmt(shownPos)}</span>
                  <input
                    type='range'
                    min={0}
                    max={Math.max(1, Math.floor(duration))}
                    step={1}
                    value={Math.floor(shownPos)}
                    disabled={!duration}
                    aria-label={t('playerSeek')}
                    aria-valuetext={`${fmt(shownPos)} / ${fmt(duration)}`}
                    onChange={(e) => setScrub(Number(e.target.value))}
                    onPointerUp={commitScrub}
                    onKeyUp={commitScrub}
                    onBlur={() => scrub !== null && commitScrub()}
                    className='player-range min-w-0 flex-1'
                    style={{ ['--progress' as string]: `${progress}%` }}
                  />
                  <span className='w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/60'>
                    {duration ? fmt(duration) : '--:--'}
                  </span>
                </div>
              </div>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hidden md:inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60 hover:text-white'
                >
                  {isMixcloud ? 'Mixcloud' : 'SoundCloud'}
                  <FiArrowUpRight className='h-3.5 w-3.5' aria-hidden />
                </a>
              )}

              <button
                type='button'
                onClick={close}
                aria-label={t('playerClose')}
                className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'
              >
                <FiX className='h-5 w-5' />
              </button>
            </div>

            {/* The widget itself plays the audio, hidden from view. If the browser
                blocks starting it (iOS), it shows above the bar to tap play there. */}
            <div
              aria-hidden={!needsTap}
              className={
                needsTap
                  ? 'absolute inset-x-0 bottom-full bg-white p-2 shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.6)]'
                  : 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
              }
            >
              {needsTap && (
                <p className='px-1 pb-1.5 font-mono text-[11px] uppercase tracking-wider text-dark-blue'>{t('playerTapToStart')}</p>
              )}
              {isSoundcloud && scReady && (
                <iframe
                  key={`sc-${trackId}`}
                  id='soundcloud-player'
                  title='SoundCloud'
                  width='100%'
                  height='20'
                  allow='autoplay'
                  onLoad={(e) => onSoundcloudLoad(e.currentTarget)}
                  src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&auto_play=true&visual=false&show_artwork=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false&origin=${origin}`}
                />
              )}
              {isMixcloud && mcReady && (
                <iframe
                  key={`mc-${showKey}`}
                  id='mixcloud-player'
                  title='Mixcloud'
                  width='100%'
                  height='60'
                  allow='autoplay'
                  onLoad={(e) => void onMixcloudLoad(e.currentTarget)}
                  src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&mini=1&feed=${showKey}&origin=${origin}`}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
