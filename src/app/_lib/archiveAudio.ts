// Archive player engine: one shared <audio> element plays SoundCloud tracks
// (HLS from /api/soundcloud-stream/[id]/hls). Playback starts right inside
// the click / tap (store.trackIdSet → playArchiveTrack), which is what iPhones
// and strict browsers require; the player bar (modules/player/CloudPlayer)
// only shows this state and calls the controls below.
import { create } from 'zustand';
import { ActivePlayer, registerArchiveStarter, useGlobalStore } from '@/hooks/useStore';
import { loadHls, playsHlsNatively, type HlsClass, type HlsInstance } from './hls';

export interface ArchiveAudioState {
  trackId: string | null;
  playing: boolean;
  /** Waiting for sound (starting, buffering) */
  loading: boolean;
  /** The browser didn't let it start on its own: tap play */
  blocked: boolean;
  /** Couldn't be loaded, even after a fresh try */
  error: boolean;
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

const playlistUrl = (id: string, fresh: boolean) =>
  `/api/soundcloud-stream/${id}/hls${fresh ? `?fresh=${Date.now()}` : ''}`;

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
  a.addEventListener('pause', () => set({ playing: false, loading: false }));
  a.addEventListener('waiting', () => set({ loading: !a.paused }));
  a.addEventListener('canplay', () => set({ loading: false }));
  a.addEventListener('ended', () => set({ playing: false, loading: false }));
  a.addEventListener('timeupdate', () => {
    if (!useArchiveAudio.getState().trackId) return;
    lastPosition = a.currentTime;
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
    // hls.js reports its own errors; a.error is null again once a newer
    // track is loading (late events of the old one are ignored)
    if (hls || !a.error || !useArchiveAudio.getState().trackId) return;
    onLoadError();
  });
  audio = a;
  return a;
}

function detach() {
  loadToken++;
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

/** Load a track into the element and play, from `startAt` seconds. */
function load(id: string, startAt: number, fresh: boolean) {
  const a = element();
  detach();
  const token = loadToken;
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
    h.on('hlsError', (_e, data) => {
      if (!data.fatal || token !== loadToken) return;
      if (data.type === 'mediaError') h.recoverMediaError();
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
  useArchiveAudio.setState({ ...initial, trackId: id, loading: true });
  load(id, 0, false);
  setupMediaSession();
}

export function toggleArchive() {
  const { trackId, error } = useArchiveAudio.getState();
  if (!trackId || !audio) return;
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
export function stopArchive() {
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
  // trackIdSet in the store starts the track synchronously (inside the click)
  registerArchiveStarter(playArchiveTrack);

  useGlobalStore.subscribe((state, prev) => {
    // Live radio, Mixcloud or closing the player: stop the archive audio
    if (
      prev.activePlayer === ActivePlayer.SOUNDCLOUD &&
      state.activePlayer !== ActivePlayer.SOUNDCLOUD &&
      useArchiveAudio.getState().trackId
    ) {
      stopArchive();
    }
    // A video with sound starts: pause, keep the bar
    if (state.pauseSignal !== prev.pauseSignal) pauseArchive();
  });

  // Ready before the first click, so playback can start inside it
  const preload = () => {
    if (!playsHlsNatively(document.createElement('audio'))) void loadHls().catch(() => {});
  };
  if (document.readyState === 'complete') setTimeout(preload, 1500);
  else window.addEventListener('load', () => setTimeout(preload, 1500), { once: true });
}
