// Archive player engine: one shared <audio> element plays SoundCloud tracks
// (HLS from /api/soundcloud-stream/[id]/hls) and the old Mixcloud shows from
// our own server (a plain .m4a / .mp3 URL as the track id, see lib/ownArchive).
// Playback starts right inside
// the click / tap (store.trackIdSet → playArchiveTrack), which is what iPhones
// and strict browsers require; the player bar (modules/player/CloudPlayer)
// only shows this state and calls the controls below.
import { create } from 'zustand';
import { ActivePlayer, registerArchiveStarter, useGlobalStore } from '@/hooks/useStore';
import { canDecodeAac } from './aacSupport';
import { loadHls, playsHlsNatively, type HlsClass, type HlsInstance } from './hls';
import {
  archiveClosed,
  archiveEnded,
  archiveFailed,
  archiveLoading,
  archivePaused,
  archivePauseIsSwitch,
  archivePosition,
  archiveSounding,
} from './listenTracking';

export interface ArchiveAudioState {
  trackId: string | null;
  playing: boolean;
  /** Waiting for sound (starting, buffering) */
  loading: boolean;
  /** The browser didn't let it start on its own: tap play */
  blocked: boolean;
  /** Couldn't be loaded, even after a fresh try */
  error: boolean;
  /** This browser can't play the file at all (an .m4a without an AAC decoder) */
  unsupported: boolean;
  /** seconds */
  position: number;
  duration: number;
}

const initial: ArchiveAudioState = {
  trackId: null,
  playing: false,
  loading: false,
  blocked: false,
  error: false,
  unsupported: false,
  position: 0,
  duration: 0,
};

export const useArchiveAudio = create<ArchiveAudioState>(() => initial);
const set = (patch: Partial<ArchiveAudioState>) => useArchiveAudio.setState(patch);

let audio: HTMLAudioElement | null = null;
let hls: HlsInstance | null = null;
/** Bumped on every new load, so late async work for an old track is dropped */
let loadToken = 0;
let lastPosition = 0;
/** Position where we last reloaded after an error (no endless reload loops) */
let retriedAt: number | null = null;
let durationHint = 0;
let meta: { title: string; artwork: string | null } | null = null;

/**
 * SoundCloud streams come as AAC (better) or MP3. Some browsers can't decode
 * AAC (the preview browser in VS Code); there we switch to MP3 and remember it.
 */
type StreamFormat = 'aac' | 'mp3';
const FORMAT_KEY = 'thfradio-archive-format';
let format: StreamFormat = 'aac';
/** Switched to MP3 because AAC couldn't be decoded: remember once MP3 plays */
let rememberMp3 = false;
/** Where this load started and whether sound has run since */
let loadStartAt = 0;
let started = false;
/** No sound this long after a start: switch format or give up, no endless 0:00 */
const STALL_MS = 12000;
let stallTimer: ReturnType<typeof setTimeout> | null = null;

/** Own archive files: the track id is the file's URL (no HLS, one format). */
export const isDirectTrack = (id: string) => /^https?:\/\//.test(id);
/** No AAC decoder here (known after the page's check) */
let aacMissing = false;

const playlistUrl = (id: string, fresh: boolean) => {
  const query = [format === 'mp3' && 'format=mp3', fresh && `fresh=${Date.now()}`].filter(Boolean).join('&');
  return `/api/soundcloud-stream/${id}/hls${query ? `?${query}` : ''}`;
};

function initialFormat(): StreamFormat {
  try {
    if (localStorage.getItem(FORMAT_KEY) === 'mp3') return 'mp3';
  } catch {
    // storage blocked: just try AAC
  }
  // Browsers that say outright they can't do AAC
  const ms = window.MediaSource;
  if (ms?.isTypeSupported && !ms.isTypeSupported('audio/mp4; codecs="mp4a.40.2"')) return 'mp3';
  return 'aac';
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const a = document.createElement('audio');
  a.id = 'thfradio-archive-player';
  a.preload = 'auto';
  a.setAttribute('playsinline', '');
  a.setAttribute('webkit-playsinline', '');
  a.hidden = true;
  document.body.appendChild(a);

  a.addEventListener('play', () => set({ playing: true, blocked: false, error: false }));
  a.addEventListener('playing', () => set({ playing: true, loading: false }));
  // Waiting for sound again (after pause or seek): watch that it comes
  a.addEventListener('play', () => watchStall());
  a.addEventListener('pause', () => clearStall());
  a.addEventListener('pause', () => set({ playing: false, loading: false }));
  // Listening statistics (lib/listenTracking): pause, end, sound, position
  const current = () => useArchiveAudio.getState().trackId;
  a.addEventListener('pause', () => {
    const id = current();
    if (id) archivePaused(id);
  });
  a.addEventListener('ended', () => {
    const id = current();
    if (id) archiveEnded(id);
  });
  a.addEventListener('playing', () => {
    const id = current();
    if (id && started) archiveSounding(id);
  });
  a.addEventListener('waiting', () => set({ loading: !a.paused }));
  a.addEventListener('canplay', () => set({ loading: false }));
  a.addEventListener('ended', () => set({ playing: false, loading: false }));
  a.addEventListener('timeupdate', () => {
    if (!useArchiveAudio.getState().trackId) return;
    lastPosition = a.currentTime;
    if (!started && !a.paused && a.currentTime > loadStartAt + 0.25) onStarted();
    const id = useArchiveAudio.getState().trackId;
    if (id && started && !a.paused) {
      archiveSounding(id);
      archivePosition(id, a.currentTime);
    }
    // Played on well past the last reload: allow another one later
    if (retriedAt !== null && lastPosition > retriedAt + 30) retriedAt = null;
    set({ position: a.currentTime });
  });
  const onDuration = () => {
    if (Number.isFinite(a.duration) && a.duration > 0) {
      set({ duration: a.duration });
      updatePositionState();
    }
  };
  a.addEventListener('durationchange', onDuration);
  a.addEventListener('loadedmetadata', onDuration);
  a.addEventListener('error', () => {
    // a.error is null again once a newer track is loading (late events of the
    // old one are ignored)
    const err = a.error;
    if (!err || !useArchiveAudio.getState().trackId) return;
    // The browser can't play this audio: try the other format
    if (err.code === err.MEDIA_ERR_DECODE || err.code === err.MEDIA_ERR_SRC_NOT_SUPPORTED) onFormatError(true);
    // hls.js reports network trouble itself
    else if (!hls) onLoadError();
  });
  audio = a;
  return a;
}

function detach() {
  loadToken++;
  clearStall();
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function play() {
  const a = element();
  set({ loading: true });
  a.play().catch((err: unknown) => {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'AbortError') return; // replaced by a newer load
    if (name === 'NotAllowedError') set({ blocked: true, loading: false, playing: false });
    else set({ loading: false });
  });
}

function clearStall() {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = null;
}

/** Started but no sound after a while: the format doesn't work here, or the links. */
function watchStall() {
  clearStall();
  if (started) return;
  const token = loadToken;
  stallTimer = setTimeout(() => {
    stallTimer = null;
    if (token !== loadToken || started || !audio || audio.paused) return;
    onFormatError(false);
  }, STALL_MS);
}

function onStarted() {
  started = true;
  clearStall();
  if (rememberMp3) {
    rememberMp3 = false;
    try {
      localStorage.setItem(FORMAT_KEY, 'mp3');
    } catch {
      // storage blocked: the switch just happens again next visit
    }
  }
}

/** Load a track into the element and play, from `startAt` seconds. */
function load(id: string, startAt: number, fresh: boolean) {
  const a = element();
  detach();
  const token = loadToken;
  loadStartAt = startAt;
  started = false;

  if (isDirectTrack(id)) {
    // An .m4a can't play without AAC: say so instead of loading forever
    if (aacMissing && !/\.mp3(\?|$)/i.test(id)) return markUnsupported();
    a.src = id;
    if (startAt > 0) a.addEventListener('loadedmetadata', () => (a.currentTime = startAt), { once: true });
    play();
    return;
  }

  const url = playlistUrl(id, fresh);

  const playNatively = () => {
    a.src = url;
    if (startAt > 0) {
      a.addEventListener('loadedmetadata', () => (a.currentTime = startAt), { once: true });
    }
    play();
  };

  if (playsHlsNatively(a)) return playNatively();

  const start = (Hls: HlsClass | null) => {
    if (token !== loadToken) return;
    if (!Hls) return playNatively();
    const h = new Hls({ startPosition: startAt > 0 ? startAt : -1, maxBufferLength: 60 });
    let recovered = false;
    h.on('hlsError', (_e, data) => {
      if (token !== loadToken || !data.fatal) return;
      // The browser can't take this audio codec: try the other format
      if (/codec/i.test(data.details ?? '')) return onFormatError(true);
      if (data.type === 'mediaError' && !recovered) {
        recovered = true;
        h.recoverMediaError();
      } else if (data.type === 'mediaError') onFormatError(true);
      else onLoadError();
    });
    hls = h;
    h.attachMedia(a);
    h.loadSource(url);
    play();
  };
  // hls.js is preloaded, so this normally runs right inside the click
  if (window.Hls) start(window.Hls.isSupported() ? window.Hls : null);
  else loadHls().then(start, () => start(null));
}

/**
 * This browser can't play the track in the current format (or it hangs):
 * switch AAC → MP3 once, otherwise treat it as a load error.
 */
function onFormatError(decodeFailed: boolean) {
  const { trackId } = useArchiveAudio.getState();
  if (!trackId) return;
  // Own files come in one format only. A missing file (taken down) also reads
  // as "not supported" in Chrome: only blame the browser when it lacks AAC.
  if (isDirectTrack(trackId)) return decodeFailed && aacMissing ? markUnsupported() : onLoadError();
  if (format === 'aac') {
    format = 'mp3';
    rememberMp3 = decodeFailed;
    load(trackId, lastPosition, false);
    return;
  }
  onLoadError();
}

function markUnsupported() {
  detach();
  set({ unsupported: true, error: true, loading: false, playing: false });
}

/** Links expired (long pause) or the network dropped: fetch a fresh playlist once, go on where we were. */
function onLoadError() {
  const { trackId } = useArchiveAudio.getState();
  if (!trackId) return;
  if (retriedAt === null) {
    retriedAt = lastPosition;
    load(trackId, lastPosition, true);
    return;
  }
  detach();
  set({ error: true, loading: false, playing: false });
  archiveFailed(trackId);
}

/* ---------- controls ---------- */

/** Start a SoundCloud track. Call it right inside the click / tap. */
export function playArchiveTrack(id: string) {
  if (typeof window === 'undefined') return;
  // Same track again (e.g. its tile): go on instead of starting over
  if (audio && useArchiveAudio.getState().trackId === id) {
    if (audio.paused || useArchiveAudio.getState().error) toggleArchive();
    return;
  }
  lastPosition = 0;
  retriedAt = null;
  durationHint = 0;
  meta = null;
  archiveLoading(id);
  useArchiveAudio.setState({ ...initial, trackId: id, loading: true });
  load(id, 0, false);
  setupMediaSession();
}

export function toggleArchive() {
  const { trackId, error, unsupported } = useArchiveAudio.getState();
  if (!trackId || !audio || unsupported) return;
  if (error) {
    retriedAt = null;
    set({ error: false });
    load(trackId, lastPosition, true);
  } else if (audio.paused) {
    play();
  } else {
    audio.pause();
  }
}

export function pauseArchive() {
  audio?.pause();
}

export function seekArchive(seconds: number) {
  if (!audio || !useArchiveAudio.getState().trackId) return;
  const duration = useArchiveAudio.getState().duration;
  const sec = Math.max(0, duration ? Math.min(duration - 1, seconds) : seconds);
  audio.currentTime = sec;
  lastPosition = sec;
  set({ position: sec });
  updatePositionState();
}

export function skipArchive(delta: number) {
  seekArchive((audio?.currentTime ?? 0) + delta);
}

/** Stop and forget the track (player closed, live radio or Mixcloud took over). */
export function stopArchive(why: 'pause' | 'switch' = 'pause') {
  archiveClosed(why);
  detach();
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  useArchiveAudio.setState(initial);
  clearMediaSession();
}

/** Title / cover / length from the archive list, for the lock screen and as length fallback. */
export function setArchiveMeta(next: { title: string; artwork: string | null; duration?: number | null }) {
  meta = { title: next.title, artwork: next.artwork };
  if (next.duration && next.duration > 0) {
    durationHint = next.duration;
    if (!useArchiveAudio.getState().duration) set({ duration: durationHint });
  }
  setupMediaSession();
}

/* ---------- lock screen / media keys ---------- */

function setupMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: meta?.title || 'THF Radio',
      artist: 'THF Radio',
      album: 'Archiv',
      artwork: meta?.artwork ? [{ src: meta.artwork, sizes: '500x500' }] : [],
    });
    ms.setActionHandler('play', () => audio && play());
    ms.setActionHandler('pause', () => audio?.pause());
    ms.setActionHandler('seekbackward', (d) => skipArchive(-(d.seekOffset || 15)));
    ms.setActionHandler('seekforward', (d) => skipArchive(d.seekOffset || 30));
    ms.setActionHandler('seekto', (d) => d.seekTime != null && seekArchive(d.seekTime));
  } catch {
    // older browsers: some actions unsupported
  }
}

function updatePositionState() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !audio) return;
  const duration = useArchiveAudio.getState().duration || durationHint;
  if (!duration) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(audio.currentTime, duration),
      playbackRate: audio.playbackRate || 1,
    });
  } catch {
    // ignore
  }
}

function clearMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]) {
      navigator.mediaSession.setActionHandler(action, null);
    }
  } catch {
    // ignore
  }
}

/* ---------- wiring ---------- */

if (typeof window !== 'undefined') {
  format = initialFormat();
  // No AAC decoder (VS Code's preview): MP3 from the first track on
  void canDecodeAac().then((ok) => {
    if (!ok) {
      format = 'mp3';
      aacMissing = true;
    }
  });
  // trackIdSet in the store starts the track synchronously (inside the click)
  registerArchiveStarter(playArchiveTrack);

  useGlobalStore.subscribe((state, prev) => {
    // Live radio, Mixcloud or closing the player: stop the archive audio
    if (
      prev.activePlayer === ActivePlayer.SOUNDCLOUD &&
      state.activePlayer !== ActivePlayer.SOUNDCLOUD &&
      useArchiveAudio.getState().trackId
    ) {
      stopArchive('switch');
    }
    // A video with sound starts: pause, keep the bar
    if (state.pauseSignal !== prev.pauseSignal) {
      if (audio && !audio.paused) archivePauseIsSwitch();
      pauseArchive();
    }
  });

  // Ready before the first click, so playback can start inside it. Not after
  // the page's 'load' (that waits for every cover image): as soon as the
  // browser has a moment, at the latest after 2 s
  const preload = () => {
    if (!playsHlsNatively(document.createElement('audio'))) void loadHls().catch(() => {});
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 2000 });
  else setTimeout(preload, 500);
}
