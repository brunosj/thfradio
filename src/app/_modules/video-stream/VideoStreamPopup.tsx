"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IoClose,
  IoContract,
  IoExpand,
  IoRemove,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import { useTranslations } from "next-intl";
import ReactPlayer from "react-player";
import { pauseLiveStream } from "@/app/_lib/liveStreamAudio";
import { useGlobalStore } from "@/app/_hooks/useStore";

interface StreamStatus {
  live: boolean;
  hlsUrl?: string;
}

interface Position {
  x: number;
  y: number;
}

const DEFAULT_HLS_URL = "https://video.thfradio.space/hls/live/index.m3u8";
const STORAGE_KEY = "video-stream-popup-position";
const POLL_MS = 10_000;
const EDGE = 16;
const DESKTOP_WIDTH = 480;
// hls.js settings: trade a few seconds of delay for smooth playback. The
// server sends 1s low-latency segments and keeps ~7s in the playlist, so we
// stay ~4 segments behind live instead of chasing the edge (which stalls on
// any network hiccup, especially on phones). Delay doesn't matter for radio.
const HLS_CONFIG = {
  hlsVersion: "1.5.20",
  hlsOptions: {
    lowLatencyMode: false,
    liveSyncDurationCount: 4,
    liveMaxLatencyDurationCount: 10,
    maxBufferLength: 30,
    backBufferLength: 30,
  },
};

// Matches the Tailwind `lg` breakpoint (67.5rem = 1080px).
const MOBILE_QUERY = "(max-width: 1079px)";

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function readSavedPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    return typeof pos?.x === "number" && typeof pos?.y === "number" ? pos : null;
  } catch {
    return null;
  }
}

function savePosition(pos: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Storage blocked (private mode etc.) — position just isn't remembered.
  }
}

function clampToViewport(pos: Position, width: number, height: number): Position {
  const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - height - EDGE);
  return {
    x: Math.min(Math.max(EDGE, pos.x), maxX),
    y: Math.min(Math.max(EDGE, pos.y), maxY),
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function VideoStreamPopup() {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const radioPlaying = useGlobalStore((state) => state.liveStreamPlaying);

  const [isLive, setIsLive] = useState(false);
  const [hlsUrl, setHlsUrl] = useState(DEFAULT_HLS_URL);
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Browsers (especially on phones) only autoplay muted video, so we start
  // muted and let people turn the sound on with one tap.
  const [muted, setMuted] = useState(true);
  const [isFullPage, setIsFullPage] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const popupRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const wasLive = useRef(false);

  // --- Stream status polling (paused while the tab is hidden) -------------
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      try {
        const res = await fetch("/api/stream-status", { cache: "no-store" });
        if (!res.ok) return setIsLive(false);
        const data: StreamStatus = await res.json();
        setIsLive(data.live);
        if (data.hlsUrl) setHlsUrl(data.hlsUrl);
      } catch {
        setIsLive(false);
      }
    };

    const start = () => {
      if (timer) return;
      check();
      timer = setInterval(check, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // A new stream going live re-opens the player, even if it was closed before.
  // On phones it starts as a small "Live video" button; the video only loads
  // (and uses data) once someone taps it.
  useEffect(() => {
    if (isLive && !wasLive.current) {
      setDismissed(false);
      setMuted(true);
      setMinimized(window.matchMedia(MOBILE_QUERY).matches);
    }
    wasLive.current = isLive;
  }, [isLive]);

  // Don't play radio and video sound at the same time.
  useEffect(() => {
    if (radioPlaying) setMuted(true);
  }, [radioPlaying]);

  const isOpen = isLive && !dismissed;
  const isExpanded = isFullPage || isNativeFullscreen;
  const isFloating = !isMobile && !isExpanded;

  // --- Desktop: initial position + keep it on screen on resize ------------
  const positionRef = useRef<Position | null>(null);
  positionRef.current = position;

  useEffect(() => {
    if (!isOpen || !isFloating) return;
    const place = () => {
      const rect = popupRef.current?.getBoundingClientRect();
      const start = positionRef.current ??
        readSavedPosition() ?? { x: EDGE, y: window.innerHeight };
      setPosition(
        clampToViewport(start, rect?.width ?? DESKTOP_WIDTH, rect?.height ?? 300),
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [isOpen, isFloating]);

  // --- Desktop dragging (pointer events: mouse, pen and touch) ------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFloating || e.button !== 0) return;
    const rect = popupRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = popupRef.current?.getBoundingClientRect();
      setPosition(
        clampToViewport(
          { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y },
          rect?.width ?? DESKTOP_WIDTH,
          rect?.height ?? 300,
        ),
      );
    };
    const onUp = () => {
      setIsDragging(false);
      if (positionRef.current) savePosition(positionRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  // --- Fullscreen ----------------------------------------------------------
  useEffect(() => {
    const onChange = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (isFullPage) {
      setIsFullPage(false);
      return;
    }
    const el = popupRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        // fall through
      }
    }
    // iPhone Safari has no element fullscreen, but the video element itself can go fullscreen.
    const video = playerRef.current?.getInternalPlayer() as unknown as FullscreenVideo | undefined;
    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
    setIsFullPage(true);
  }, [isFullPage]);

  const toggleMute = () => {
    if (muted) pauseLiveStream();
    setMuted(!muted);
  };

  const close = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setIsFullPage(false);
    setDismissed(true);
  };

  if (!isOpen) return null;

  // --- Minimized: small "LIVE" pill (bottom left, clear of the chat button) -
  if (minimized && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsBuffering(true);
          setMinimized(false);
        }}
        className="fixed left-3 z-[60] flex items-center gap-2 rounded-full bg-thf-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-2xl lg:left-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        aria-label={t("videoStream.open")}
      >
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        {t("videoStream.title")}
      </button>
    );
  }

  const iconButton =
    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 lg:h-8 lg:w-8";

  const containerClass = isExpanded
    ? "fixed inset-0 z-[70] h-dvh w-full"
    : isMobile
      ? "fixed inset-x-3 z-[60] rounded-xl"
      : "fixed z-[60] rounded-lg";

  const containerStyle: React.CSSProperties = isExpanded
    ? {
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }
    : isMobile
      ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }
      : {
          left: position?.x ?? EDGE,
          top: position?.y ?? EDGE,
          width: `min(${DESKTOP_WIDTH}px, calc(100vw - ${EDGE * 2}px))`,
          visibility: position ? "visible" : "hidden",
        };

  return (
    <div
      ref={popupRef}
      className={`${containerClass} flex flex-col overflow-hidden bg-black shadow-2xl`}
      style={containerStyle}
    >
      <div
        onPointerDown={onPointerDown}
        className="flex items-center justify-between gap-2 bg-thf-blue-500 py-1.5 pr-1.5 pl-3 text-white"
        style={{
          cursor: isFloating ? (isDragging ? "grabbing" : "grab") : "default",
          userSelect: "none",
          touchAction: isFloating ? "none" : "auto",
        }}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="truncate">{t("videoStream.title")}</span>
        </span>

        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={toggleMute}
            className={iconButton}
            aria-label={muted ? t("videoStream.unmute") : t("videoStream.mute")}
          >
            {muted ? <IoVolumeMute className="h-5 w-5" /> : <IoVolumeHigh className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={iconButton}
            aria-label={isExpanded ? t("videoStream.exitFullscreen") : t("videoStream.fullscreen")}
          >
            {isExpanded ? <IoContract className="h-5 w-5" /> : <IoExpand className="h-5 w-5" />}
          </button>
          {!isExpanded && (
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className={iconButton}
              aria-label={t("videoStream.minimize")}
            >
              <IoRemove className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className={iconButton}
            aria-label={t("videoStream.close")}
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={`relative w-full bg-black ${isExpanded ? "min-h-0 flex-1" : "aspect-video"}`}
      >
        <ReactPlayer
          ref={playerRef}
          url={hlsUrl}
          playing
          muted={muted}
          controls={!muted}
          playsinline
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
          config={{ file: HLS_CONFIG }}
          onBuffer={() => setIsBuffering(true)}
          onBufferEnd={() => setIsBuffering(false)}
          onPlay={() => setIsBuffering(false)}
        />

        {isBuffering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}

        {muted && (
          <button
            type="button"
            onClick={toggleMute}
            className="absolute inset-0 flex items-end justify-start p-3"
            aria-label={t("videoStream.unmute")}
          >
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-sm font-semibold text-white">
              <IoVolumeMute className="h-4 w-4" />
              {t("videoStream.unmute")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
