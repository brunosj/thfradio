'use client';

// Live video stream (thfradio.space HLS) in a small player docked bottom
// right, next to the chat button, while it is on air.
// - Starts muted right away (browsers allow that); "Sound on" turns the sound
//   on and pauses the radio stream. Radio or archive audio starting mutes it.
// - A click on the video (or the fullscreen button) plays it fullscreen.
// - ✕ folds it into a small "Live video" button next to the chat button; it
//   opens again by itself the next time the stream goes on air.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiMaximize, FiVolume2, FiX } from 'react-icons/fi';
import { useGlobalStore } from '@/hooks/useStore';
import { pauseLiveStream } from '@/app/_lib/liveStreamAudio';

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
    Hls?: HlsClass;
  }
}

const HLS_SCRIPT = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';
const LIVE_FALLBACK_URL = 'https://video.thfradio.space/hls/live/index.m3u8';
const STATUS_POLL_MS = 15000;

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

/** Is the live video stream on air? Polled. */
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

/** Pause the radio stream (this player gets the sound). */
function takeOverSound() {
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
  const ref = videoRef;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: HlsInstance | null = null;
    let cancelled = false;
    const play = () => video.play().catch(() => {});
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
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      onClick={onClick}
      className='absolute inset-0 h-full w-full cursor-zoom-in bg-black'
      onVolumeChange={(e) => onMutedChange(e.currentTarget.muted)}
    />
  );
}


/* ---------- the dock player ---------- */

export default function LiveVideoPlayer() {
  const t = useTranslations();
  const live = useLiveStream();
  const [folded, setFolded] = useState(false);
  const [muted, setMuted] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const liveVideo = useRef<HTMLVideoElement | null>(null);

  // Folded live video opens again the next time the stream goes on air
  const wasOn = useRef(false);
  useEffect(() => {
    if (live.on && !wasOn.current) {
      setFolded(false);
      setMuted(true);
    }
    wasOn.current = live.on;
  }, [live.on]);

  useAudioStarted(() => setMuted(true));

  useEffect(() => {
    if (!live.on || folded) return;
    const onKey = (e: KeyboardEvent) => {
      // In fullscreen, Escape only leaves fullscreen
      if (e.key === 'Escape' && !document.fullscreenElement) setFolded(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [live.on, folded]);

  if (!live.on) return null;

  if (folded) {
    return (
      <button
        type='button'
        onClick={() => setFolded(false)}
        aria-label={t('videoShowLive')}
        className='inline-flex items-center gap-2 rounded-xl border border-white bg-dark-blue p-3 font-mono font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-thf-blue-500'
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

  const unmute = () => {
    takeOverSound();
    setMuted(false);
  };
  // Sound turned on another way → it gets the sound too
  const onMutedChange = (m: boolean) => {
    if (!m && muted) takeOverSound();
    setMuted(m);
  };

  const iconButton =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white hover:text-dark-blue';

  return (
    <div
      role='region'
      aria-label={t('videoLive')}
      className='w-[min(320px,calc(100vw-1.5rem))] sm:w-[380px] overflow-hidden rounded-lg border border-white/30 bg-black shadow-2xl'
    >
      <div className='flex items-center gap-2 bg-dark-blue px-2.5 py-1.5 text-white'>
        <p className='flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] uppercase tracking-wide'>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold'>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-white' />
            Live
          </span>
          <span className='truncate'>{t('videoLive')}</span>
        </p>
        <button type='button' onClick={fullscreen} aria-label={t('videoFullscreen')} className={iconButton}>
          <FiMaximize className='h-3.5 w-3.5' />
        </button>
        <button type='button' onClick={() => setFolded(true)} aria-label={t('videoFold')} className={iconButton}>
          <FiX className='h-4 w-4' />
        </button>
      </div>

      <div ref={box} className='relative aspect-video w-full bg-black'>
        <LiveVideo url={live.url} muted={muted} onMutedChange={onMutedChange} videoRef={liveVideo} onClick={fullscreen} />
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
