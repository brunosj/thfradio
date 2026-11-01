'use client';

// Small video player docked bottom right, next to the chat button. It lives in
// the layout, so it keeps playing while you browse. Two sources:
// - the live video stream (thfradio.space HLS) while it is on air: starts
//   muted right away (browsers allow that), "Sound on" turns the sound on;
//   ✕ folds it into a small "Live video" button next to the chat button;
// - a YouTube video picked in the video row (takes the place of the live
//   video until it is closed): starts with sound, muted if the browser says no.
// Sound here pauses the radio/archive audio; radio/archive audio starting
// mutes the live video or pauses the YouTube video. A click on the live
// video (or the fullscreen button) plays it fullscreen.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowUpRight, FiMaximize, FiPlay, FiVolume2, FiX } from 'react-icons/fi';
import { useGlobalStore } from '@/hooks/useStore';
import { pauseLiveStream } from '@/app/_lib/liveStreamAudio';
import { keepWithName } from '@/utils/titles';

/* ---------- YouTube player API ---------- */

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  destroy: () => void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };

/* ---------- hls.js (only where the browser can't play HLS itself) ---------- */

type HlsInstance = {
  loadSource: (url: string) => void;
  attachMedia: (el: HTMLVideoElement) => void;
  on: (event: string, cb: (event: string, data: { fatal?: boolean; type?: string }) => void) => void;
  startLoad: () => void;
  recoverMediaError: () => void;
  destroy: () => void;
};
type HlsClass = { new (config?: Record<string, unknown>): HlsInstance; isSupported: () => boolean };

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
    Hls?: HlsClass;
  }
}

const HLS_SCRIPT = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';
const LIVE_FALLBACK_URL = 'https://video.thfradio.space/hls/live/index.m3u8';
const STATUS_POLL_MS = 15000;
const YT_PLAYING = 1;
const YT_BUFFERING = 3;

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error(`Could not load ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

let ytReady: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytReady ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    void loadScript('https://www.youtube.com/iframe_api');
  });
  return ytReady;
}

/** Is the live video stream on air? Polled; null until the first answer. */
function useLiveStream() {
  const [live, setLive] = useState<{ on: boolean; url: string }>({ on: false, url: LIVE_FALLBACK_URL });
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch('/api/stream-status', { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!stopped) setLive({ on: data?.live === true, url: data?.hlsUrl || LIVE_FALLBACK_URL });
      } catch {
        if (!stopped) setLive((l) => ({ ...l, on: false }));
      }
    };
    void check();
    const id = setInterval(check, STATUS_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);
  return live;
}

/** Pause the radio stream and the archive player (this player gets the sound). */
function takeOverSound() {
  useGlobalStore.getState().requestPause();
  void pauseLiveStream();
}

/** Did radio or archive audio just start? */
function useAudioStarted(onStart: () => void) {
  const cb = useRef(onStart);
  cb.current = onStart;
  useEffect(
    () =>
      useGlobalStore.subscribe((s, prev) => {
        if (
          (s.liveStreamPlaying && !prev.liveStreamPlaying) ||
          (!!s.trackId && s.trackId !== prev.trackId) ||
          (!!s.showKey && s.showKey !== prev.showKey)
        )
          cb.current();
      }),
    [],
  );
}

/* ---------- live video ---------- */

function LiveVideo({
  url,
  muted,
  onMutedChange,
  videoRef,
  onClick,
}: {
  url: string;
  muted: boolean;
  onMutedChange: (m: boolean) => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onClick: () => void;
}) {
  const t = useTranslations();
  const ref = videoRef;
  // The browser refused to start it (e.g. iPhone in Low Power Mode): tap to play
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: HlsInstance | null = null;
    let cancelled = false;
    // iOS only autoplays inline when the video is muted as an attribute too
    // (React sets just the property)
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    const play = () =>
      video
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    const playNatively = () => {
      video.src = url;
      play();
    };

    // Safari / iOS play HLS themselves. Chrome also says it can, but fails on
    // this stream (separate audio track), so everyone else gets hls.js.
    const ua = navigator.userAgent;
    const appleNative = /^((?!chrome|chromium|crios|android).)*safari/i.test(ua) || /iP(hone|ad|od)/.test(ua);
    if (appleNative && video.canPlayType('application/vnd.apple.mpegurl')) {
      playNatively();
    } else {
      loadScript(HLS_SCRIPT)
        .then(() => {
          const Hls = window.Hls;
          if (cancelled) return;
          if (!Hls?.isSupported()) return playNatively();
          // Stay ~4 s behind live (more cushion against stalls); the stream
          // keeps only ~7 one-second segments, so not much further back.
          hls = new Hls({
            liveSyncDurationCount: 4,
            liveMaxLatencyDurationCount: 6,
            maxLiveSyncPlaybackRate: 1.1,
            maxBufferLength: 10,
            backBufferLength: 10,
            startFragPrefetch: true,
          });
          hls.on('hlsError', (_e, data) => {
            if (!data.fatal) return;
            if (data.type === 'mediaError') hls?.recoverMediaError();
            else hls?.startLoad();
          });
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on('hlsManifestParsed', play);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [url, ref]);

  const reportMuted = useRef(onMutedChange);
  reportMuted.current = onMutedChange;
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    // Keep it running with sound; if the browser refuses, back to muted
    if (!muted) video.play().catch(() => reportMuted.current(true));
  }, [muted, ref]);

  return (
    <>
      <video
        ref={ref}
        autoPlay
        muted
        playsInline
        onClick={onClick}
        onPlaying={() => setBlocked(false)}
        className='absolute inset-0 h-full w-full cursor-zoom-in bg-black'
        onVolumeChange={(e) => onMutedChange(e.currentTarget.muted)}
      />
      {blocked && (
        <button
          type='button'
          // play() right in the tap: iOS only allows it there
          onClick={() => ref.current?.play().then(() => setBlocked(false)).catch(() => {})}
          aria-label={t('videoStart')}
          className='absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-dark-blue shadow-lg hover:bg-orange-500 hover:text-white'
        >
          <FiPlay className='h-6 w-6 translate-x-[1px]' fill='currentColor' />
        </button>
      )}
    </>
  );
}

/* ---------- YouTube video ---------- */

function YouTubeVideo({
  id,
  playerRef,
  onMutedChange,
}: {
  id: string;
  playerRef: React.MutableRefObject<YTPlayer | null>;
  onMutedChange: (m: boolean) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const setMuted = useRef(onMutedChange);
  setMuted.current = onMutedChange;

  useEffect(() => {
    if (!holder.current) return;
    let cancelled = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const el = document.createElement('div');
    holder.current.replaceChildren(el);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.playVideo();
            // Sound blocked by the browser: play muted instead of hanging
            fallback = setTimeout(() => {
              const state = e.target.getPlayerState();
              if (state !== YT_PLAYING && state !== YT_BUFFERING) {
                e.target.mute();
                e.target.playVideo();
                setMuted.current(true);
              }
            }, 1200);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [id, playerRef]);

  return <div ref={holder} className='absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full' />;
}

/* ---------- the dock player ---------- */

export default function MiniVideoPlayer() {
  const t = useTranslations();
  const video = useGlobalStore((s) => s.video);
  const setVideo = useGlobalStore((s) => s.setVideo);
  const live = useLiveStream();
  const [liveFolded, setLiveFolded] = useState(false);
  const [liveMuted, setLiveMuted] = useState(true);
  const [ytMuted, setYtMuted] = useState(false);
  const yt = useRef<YTPlayer | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const liveVideo = useRef<HTMLVideoElement | null>(null);

  // Folded live video opens again the next time the stream goes on air
  const wasOn = useRef(false);
  useEffect(() => {
    if (live.on && !wasOn.current) {
      setLiveFolded(false);
      setLiveMuted(true);
    }
    wasOn.current = live.on;
  }, [live.on]);

  useEffect(() => setYtMuted(false), [video]);

  const mode: 'youtube' | 'live' | 'folded' | null = video
    ? 'youtube'
    : live.on
      ? liveFolded
        ? 'folded'
        : 'live'
      : null;

  useAudioStarted(() => {
    yt.current?.pauseVideo();
    setLiveMuted(true);
  });

  // ✕: a YouTube video closes (the live video, if on air, comes back);
  // the live video folds into the small button
  const close = () => (mode === 'youtube' ? setVideo(null) : setLiveFolded(true));

  useEffect(() => {
    if (mode !== 'youtube' && mode !== 'live') return;
    const onKey = (e: KeyboardEvent) => {
      // In fullscreen, Escape only leaves fullscreen
      if (e.key !== 'Escape' || document.fullscreenElement) return;
      if (useGlobalStore.getState().video) setVideo(null);
      else setLiveFolded(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, setVideo]);

  if (!mode) return null;

  if (mode === 'folded') {
    return (
      <button
        type='button'
        onClick={() => setLiveFolded(false)}
        aria-label={t('videoShowLive')}
        className='inline-flex items-center gap-2 border border-white bg-dark-blue p-3 font-mono font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-thf-blue-500'
      >
        <span className='h-2 w-2 animate-pulse rounded-full bg-red-500' />
        {t('videoLive')}
      </button>
    );
  }

  // Fullscreen: the whole video box (with the sound button); iPhones only
  // allow the bare video element
  const fullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = liveVideo.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };

  const muted = mode === 'live' ? liveMuted : ytMuted;
  const unmute = () => {
    takeOverSound();
    if (mode === 'live') {
      // Right in the tap: iOS only allows sound from here
      const v = liveVideo.current;
      if (v) {
        v.muted = false;
        void v.play().catch(() => {});
      }
      setLiveMuted(false);
    }
    else {
      yt.current?.unMute();
      yt.current?.playVideo();
      setYtMuted(false);
    }
  };
  // Sound turned on with the video's own controls → it gets the sound too
  const onLiveMuted = (m: boolean) => {
    if (!m && liveMuted) takeOverSound();
    setLiveMuted(m);
  };

  const iconButton =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white hover:text-dark-blue';

  return (
    <div
      role='region'
      aria-label={mode === 'live' ? t('videoLive') : video!.title}
      className='w-[min(320px,calc(100vw-1.5rem))] sm:w-[380px] border border-white/30 bg-black shadow-2xl'
    >
      <div className='flex items-center gap-2 bg-dark-blue px-2.5 py-1.5 text-white'>
        {mode === 'live' ? (
          <p className='flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] uppercase tracking-wide'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold'>
              <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-white' />
              Live
            </span>
            <span className='truncate'>{t('videoLive')}</span>
          </p>
        ) : (
          <>
            <p className='min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-wide'>{keepWithName(video!.title)}</p>
            <a
              href={video!.youtubeUrl}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='YouTube'
              className={iconButton}
              onClick={() => yt.current?.pauseVideo()}
            >
              <FiArrowUpRight className='h-4 w-4' aria-hidden />
            </a>
          </>
        )}
        <button type='button' onClick={fullscreen} aria-label={t('videoFullscreen')} className={iconButton}>
          <FiMaximize className='h-3.5 w-3.5' />
        </button>
        <button
          type='button'
          onClick={close}
          aria-label={mode === 'live' ? t('videoFold') : t('videoClose')}
          className={iconButton}
        >
          <FiX className='h-4 w-4' />
        </button>
      </div>

      <div ref={box} className='relative aspect-video w-full bg-black'>
        {mode === 'live' ? (
          <LiveVideo url={live.url} muted={liveMuted} onMutedChange={onLiveMuted} videoRef={liveVideo} onClick={fullscreen} />
        ) : video!.youtubeId.startsWith('sample-') ? (
          <div className='absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-wider text-white/60'>
            {t('videoSample')}
          </div>
        ) : (
          <YouTubeVideo key={video!.youtubeId} id={video!.youtubeId} playerRef={yt} onMutedChange={setYtMuted} />
        )}
        {muted && (
          <button
            type='button'
            onClick={unmute}
            className='absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-dark-blue shadow-lg hover:bg-orange-500 hover:text-white'
          >
            <FiVolume2 className='h-3.5 w-3.5' />
            {t('videoUnmute')}
          </button>
        )}
      </div>
    </div>
  );
}
