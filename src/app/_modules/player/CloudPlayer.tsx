'use client';

// Archive player: our own bar at the bottom of every page (cover, title,
// play / pause, progress you can drag, link to the source, close).
// - SoundCloud tracks play in our own <audio> (lib/archiveAudio), started
//   right inside the click on a tile, so it works on iPhones and in strict
//   browsers too. This bar shows its state and calls its controls.
// - Mixcloud shows play in Mixcloud's widget (hidden iframe, official widget
//   API); if the browser blocks starting it, the widget shows above the bar
//   to tap play there. Browsers without AAC (VS Code's preview) can't play
//   Mixcloud at all: the bar says so and links to Mixcloud instead.
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowUpRight, FiRotateCw, FiX } from 'react-icons/fi';
import { Link } from '@/i18n/routing';
import { Play } from '@/common/assets/PlayIcon';
import { showMatcher } from '@/utils/guests';
import { useData } from '@/context/DataContext';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import {
  seekArchive,
  setArchiveMeta,
  skipArchive,
  stopArchive,
  toggleArchive,
  useArchiveAudio,
} from '@/lib/archiveAudio';
import { canDecodeAac } from '@/lib/aacSupport';
import type { MixcloudWidget } from '@/types/mixcloud';

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

/** Widget calls can throw once its iframe is gone; never let that take the page down. */
const safely = (fn: () => unknown) => {
  try {
    const result = fn();
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    // widget already gone
  }
};

export default function CloudPlayer() {
  const t = useTranslations();
  const showKey = useGlobalStore((s) => s.showKey);
  const trackId = useGlobalStore((s) => s.trackId);
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const currentShowUrl = useGlobalStore((s) => s.currentShowUrl);
  const resetPlayer = useGlobalStore((s) => s.resetPlayer);
  const { cloudShows } = useData();

  const isSoundcloud = activePlayer === ActivePlayer.SOUNDCLOUD && !!trackId;
  const isMixcloud = activePlayer === ActivePlayer.MIXCLOUD && !!showKey;
  const visible = isSoundcloud || isMixcloud;

  /* ---------- SoundCloud: state of our own audio ---------- */
  const sc = useArchiveAudio();

  /* ---------- Mixcloud: widget state ---------- */
  const [mcReady, setMcReady] = useState(false);
  const [mcPlaying, setMcPlaying] = useState(false);
  const [mcPosition, setMcPosition] = useState(0);
  const [mcDuration, setMcDuration] = useState(0);
  const mcPlayingRef = useRef(false);
  const mcPositionRef = useRef(0);
  const mcRef = useRef<MixcloudWidget | null>(null);
  /** The browser blocked starting the hidden Mixcloud widget: show it to tap play */
  const [needsTap, setNeedsTap] = useState(false);
  /** Mixcloud streams are AAC only: no AAC, no Mixcloud (no endless loading) */
  const [aacOk, setAacOk] = useState(true);
  useEffect(() => {
    void canDecodeAac().then(setAacOk);
  }, []);
  const mcUnsupported = isMixcloud && !aacOk;
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = isSoundcloud ? sc.playing : mcPlaying;
  const position = isSoundcloud ? sc.position : mcPosition;
  const duration = isSoundcloud ? sc.duration : mcDuration;

  /** Slider position while dragging (seconds), applied on release */
  const [scrub, setScrub] = useState<number | null>(null);

  // Title + cover from the archive; for tracks not in it, ask SoundCloud
  const fromArchive = useMemo(() => {
    if (!cloudShows || !currentShowUrl) return null;
    const show = cloudShows.find((s) => s.url === currentShowUrl);
    if (!show) return null;
    return {
      title: cleanTitle(show.name || ''),
      image: show.pictures?.extra_large || show.picture || null,
      duration: show.durationSec ?? null,
    };
  }, [cloudShows, currentShowUrl]);
  const [trackInfo, setTrackInfo] = useState<{ id: string; title: string; image: string | null; url: string | null; duration: number | null } | null>(null);
  useEffect(() => {
    if (!isSoundcloud || !trackId || fromArchive || trackInfo?.id === trackId) return;
    let cancelled = false;
    fetch(`/api/soundcloud-stream/${trackId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (cancelled || !info) return;
        setTrackInfo({ id: trackId, title: info.title || '', image: info.artwork ?? null, url: info.permalink ?? null, duration: info.duration ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSoundcloud, trackId, fromArchive, trackInfo?.id]);
  const info = trackInfo && trackInfo.id === trackId ? trackInfo : null;
  const title = fromArchive?.title || (info?.title ? cleanTitle(info.title) : '') || '…';
  const image = fromArchive?.image || info?.image || null;
  const sourceUrl = currentShowUrl || info?.url || '';

  // Lock screen / media keys: title, cover, length
  useEffect(() => {
    if (!isSoundcloud || title === '…') return;
    setArchiveMeta({ title, artwork: image, duration: fromArchive?.duration ?? info?.duration ?? null });
  }, [isSoundcloud, title, image, fromArchive?.duration, info?.duration]);

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

  /* ---------- Mixcloud widget ---------- */
  useEffect(() => {
    mcPlayingRef.current = mcPlaying;
    if (mcPlaying) setNeedsTap(false);
  }, [mcPlaying]);
  useEffect(() => {
    mcPositionRef.current = mcPosition;
  }, [mcPosition]);

  // Tell the chat button to make room while the tap-to-start strip is open
  const setPlayerTapNeeded = useGlobalStore((s) => s.setPlayerTapNeeded);
  useEffect(() => setPlayerTapNeeded(isMixcloud && needsTap), [isMixcloud, needsTap, setPlayerTapNeeded]);

  // If nothing plays a few seconds after we asked, the browser blocked it.
  // iPhones / iPads never let the widget start by itself: ask right away.
  const expectPlayback = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    const ua = navigator.userAgent;
    const appleTouch = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    tapTimer.current = setTimeout(
      () => {
        if (!mcPlayingRef.current && mcPositionRef.current < 0.5) setNeedsTap(true);
      },
      appleTouch ? 300 : 4000,
    );
  };
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  // New Mixcloud show → reset its state
  useEffect(() => {
    setNeedsTap(false);
    setMcPlaying(false);
    setMcPosition(0);
    setMcDuration(0);
  }, [showKey, activePlayer]);

  // Something else wants the sound (a video): pause, keep the bar
  // (the SoundCloud audio listens to the same signal itself)
  const pauseSignal = useGlobalStore((s) => s.pauseSignal);
  useEffect(() => {
    if (!pauseSignal || !mcRef.current) return;
    const w = mcRef.current;
    safely(() => w.pause());
  }, [pauseSignal]);

  // Mixcloud no longer active: forget the widget (its iframe is gone already)
  useEffect(() => {
    if (!isMixcloud && mcRef.current) {
      const w = mcRef.current;
      mcRef.current = null;
      safely(() => w.pause());
    }
  }, [isMixcloud]);

  const onMixcloudLoad = async (iframe: HTMLIFrameElement) => {
    if (!window.Mixcloud) return;
    try {
      const w = window.Mixcloud.PlayerWidget(iframe);
      await w.ready;
      mcRef.current = w;
      w.events.play.on(() => setMcPlaying(true));
      w.events.pause.on(() => setMcPlaying(false));
      w.events.ended.on(() => setMcPlaying(false));
      w.events.progress.on((pos, dur) => {
        setMcPosition(pos);
        if (dur) setMcDuration(dur);
        if (pos > 0.5 && !mcPlayingRef.current) setMcPlaying(true);
      });
      setMcDuration(await w.getDuration());
      expectPlayback();
      await w.play();
    } catch (error) {
      console.error('Mixcloud widget error:', error);
    }
  };

  /* ---------- controls ---------- */
  const toggle = () => {
    if (mcUnsupported) {
      if (/^https:\/\//.test(sourceUrl)) window.open(sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (isSoundcloud) toggleArchive();
    else if (isMixcloud && mcRef.current) {
      const w = mcRef.current;
      safely(() => w.togglePlay());
    }
  };

  const seekTo = (seconds: number) => {
    if (!duration) return;
    const sec = Math.max(0, Math.min(duration - 1, seconds));
    if (isSoundcloud) seekArchive(sec);
    else if (isMixcloud && mcRef.current) {
      const w = mcRef.current;
      setMcPosition(sec);
      safely(() => w.seek(sec));
    }
  };
  const skip = (delta: number) => (isSoundcloud ? skipArchive(delta) : seekTo(position + delta));
  const commitScrub = () => {
    if (scrub !== null) seekTo(scrub);
    setScrub(null);
  };

  const close = () => {
    if (mcRef.current) {
      const w = mcRef.current;
      mcRef.current = null;
      safely(() => w.pause());
    }
    stopArchive();
    resetPlayer();
  };

  const origin = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin);
  const shownPos = scrub ?? position;
  const progress = duration ? Math.min(100, (shownPos / duration) * 100) : 0;
  const loading = isSoundcloud && sc.loading && !sc.error;
  const failed = isSoundcloud && sc.error;
  const blocked = isSoundcloud && sc.blocked && !sc.playing;

  return (
    <>
      <Script src='https://widget.mixcloud.com/media/js/widgetApi.js' strategy='lazyOnload' onLoad={() => setMcReady(true)} onReady={() => setMcReady(true)} />

      {visible && (
        <>
          {/* Keeps the page bottom (footer) clear of the bar */}
          <div aria-hidden style={{ height: PLAYER_BAR_HEIGHT }} />

          <div
            role='region'
            data-area='player'
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
                aria-label={
                  mcUnsupported ? t('playerOnMixcloud') : failed ? t('playerRetry') : playing ? t('playerPause') : t('playerPlay')
                }
                data-player-toggle
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-dark-blue transition-colors hover:bg-orange-500 hover:text-white ${
                  blocked ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-dark-blue animate-pulse' : ''
                }`}
              >
                {mcUnsupported ? (
                  <FiArrowUpRight className='h-4 w-4' aria-hidden />
                ) : failed ? (
                  <FiRotateCw className='h-4 w-4' aria-hidden />
                ) : playing && !loading ? (
                  <span aria-hidden className='flex gap-[3px]'>
                    <span className='h-3.5 w-[3px] bg-current' />
                    <span className='h-3.5 w-[3px] bg-current' />
                  </span>
                ) : loading ? (
                  <span aria-hidden className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
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
                {mcUnsupported ? (
                  <a
                    href={sourceUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-1.5 block truncate font-mono text-[11px] text-orange-400 hover:underline'
                    role='status'
                  >
                    {t('playerMixcloudUnsupported')}
                  </a>
                ) : failed || blocked ? (
                  <p className='mt-1.5 font-mono text-[11px] text-orange-400' role='status'>
                    {failed ? t('playerError') : t('playerBlocked')}
                  </p>
                ) : (
                  /* Slider: drag or click to jump; applied on release */
                  <div className='mt-1.5 flex items-center gap-2.5'>
                    <span className='w-12 shrink-0 font-mono text-[11px] tabular-nums text-white/60' data-player-position>
                      {fmt(shownPos)}
                    </span>
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
                )}
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

            {/* Mixcloud: the widget plays the audio, hidden from view. If the
                browser blocks starting it, it shows above the bar to tap play. */}
            {isMixcloud && (
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
                {mcReady && !mcUnsupported && (
                  <iframe
                    key={`mc-${showKey}`}
                    id='mixcloud-player'
                    title='Mixcloud'
                    width='100%'
                    height='60'
                    // Mixcloud's widget plays protected streams: without
                    // encrypted-media it waits for a tap inside it
                    allow='autoplay; encrypted-media'
                    onLoad={(e) => void onMixcloudLoad(e.currentTarget)}
                    src={`https://player-widget.mixcloud.com/?hide_cover=1&autoplay=1&mini=1&feed=${showKey}&origin=${origin}`}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
