// Listening statistics for the THF Radio intranet (Streaming → Control room).
// Every play of the live stream or an archive show sends a few Umami events:
// where it started, how long it ran, why it stopped (paused, phone locked,
// error, left the page, switched to something else), buffering, and for
// archive shows which minutes of the episode were heard. No personal data:
// show names, page names and minutes only. `track()` does nothing when the
// analytics script isn't loaded (localhost, previews, inside the intranet's
// frame), so these calls are safe everywhere.
//
// Event names and property names are read by the intranet (admin-api →
// Umami event-data), keep them as they are:
//   listen-start-live    { ch, show, from, wh }
//   listen-stop-live     { ch, show, min, why: pause|error|leave|hidden|switch }
//   listen-buffer-live   { ch, show }
//   listen-start-archive { show, ep, from, wh }
//   listen-min-archive   { show, min, sm: "show|min" }
//   listen-stop-archive  { show, min, why: pause|ended|leave|switch|error }
import { track } from './analytics';

/** Minutes of an archive episode we report as "heard" */
export const ARCHIVE_MILESTONES = [1, 5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LOCALES = ['de', 'en'];

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n).trim() : s);

/** "3-21" = Wednesday 21:xx in Berlin (1 = Monday … 7 = Sunday). */
export function weekdayHour(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const weekday = WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value ?? '') + 1;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  return `${weekday || 1}-${hour}`;
}

/** Page name without the language: "/" → home, "/shows/x" → show page, "/latest" → latest. */
export function pageOf(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length && LOCALES.includes(parts[0])) parts.shift();
  if (!parts.length) return 'home';
  if (parts[0] === 'shows') return parts.length > 1 ? 'show page' : 'shows';
  return /^[a-z0-9-]{1,30}$/.test(parts[0]) ? parts[0] : 'other';
}

/** Series of an episode title: "Show w/ Guest // 22.10.26" → "Show". */
export function seriesName(title: string): string {
  const series = String(title || '')
    .split(/\s+\/\/\s*|\s*\/\/\s+/)[0]
    .split(/\s+(?:w\/|ft\.|feat\.)\s+/i)[0]
    .trim();
  return cut(series, 60);
}

/** Marked page area (data-area="player"…), else header / footer / menu / page. */
export function areaOf(el: Element | null): string {
  if (!el) return 'page';
  const marked = el.closest('[data-area]')?.getAttribute('data-area');
  if (marked) return marked;
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (el.closest('nav')) return 'menu';
  return 'page';
}

/* ---------- page signals: last click, hidden page, leaving ---------- */

let lastPress: { at: number; el: Element } | null = null;
let hiddenAt = 0;
let wired = false;

function wire() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  const remember = (e: Event) => {
    if (e.target instanceof Element) lastPress = { at: Date.now(), el: e.target };
  };
  document.addEventListener('pointerdown', remember, true);
  document.addEventListener('keydown', remember, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  });
  // Leaving / closing the page while something plays (best effort: mobile
  // browsers don't always get to send it)
  window.addEventListener('pagehide', () => {
    liveStopped('leave');
    archiveLeft();
  });
}

/** "home · player": the page and the area of the click that started playback. */
export function startOrigin(fallbackArea: string): string {
  if (typeof window === 'undefined') return `other · ${fallbackArea}`;
  wire();
  const recent = lastPress && Date.now() - lastPress.at < 3000 ? lastPress.el : null;
  return `${pageOf(window.location.pathname)} · ${recent ? areaOf(recent) : fallbackArea}`;
}

/** The page went to the background (screen locked, app switched) just now. */
function justHidden() {
  return document.visibilityState === 'hidden' || Date.now() - hiddenAt < 5000;
}

/* ---------- live stream ---------- */

export type LiveStopReason = 'pause' | 'error' | 'leave' | 'hidden' | 'switch';

let live: { ch: 1 | 2; show: string; startedAt: number; buffers: number } | null = null;
let stallTimer: ReturnType<typeof setTimeout> | null = null;

const clearStall = () => {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = null;
};

/** Live sound started on a channel. Nothing new while the same channel keeps playing. */
export function liveStarted(ch: 1 | 2, show: string, from: string) {
  wire();
  if (live?.ch === ch) return;
  if (live) liveStopped('switch');
  archiveSwitched();
  live = { ch, show: cut(show, 60), startedAt: Date.now(), buffers: 0 };
  track('listen-start-live', { ch, show: live.show, from, wh: weekdayHour() });
}

/** Live play over; once per start (later calls do nothing). */
export function liveStopped(why: LiveStopReason) {
  if (!live) return;
  const { ch, show, startedAt } = live;
  live = null;
  clearStall();
  track('listen-stop-live', { ch, show, min: Math.round((Date.now() - startedAt) / 60000), why });
}

/** The live element paused without us asking: phone locked / background, or a pause. */
export function liveInterrupted() {
  if (!live) return;
  liveStopped(justHidden() ? 'hidden' : 'pause');
}

/** Waiting for data: counts as buffering when it lasts more than 2 s (max 5 per play). */
export function liveStalled() {
  if (!live || stallTimer) return;
  stallTimer = setTimeout(() => {
    stallTimer = null;
    if (!live || live.buffers >= 5) return;
    live.buffers++;
    track('listen-buffer-live', { ch: live.ch, show: live.show });
  }, 2000);
}

export function liveFlowing() {
  clearStall();
}

/* ---------- archive (SoundCloud in our own player, Mixcloud widget) ---------- */

export type ArchiveStopReason = 'pause' | 'ended' | 'leave' | 'switch' | 'error';

interface ArchivePlay {
  id: string;
  from: string;
  show: string;
  ep: string;
  /** sound has run (start counted from then on) */
  sounding: boolean;
  startSent: boolean;
  startTimer: ReturnType<typeof setTimeout> | null;
  milestones: Set<number>;
  position: number;
  /** paused: becomes a stop unless it plays on within PAUSE_GRACE_MS */
  pauseTimer: ReturnType<typeof setTimeout> | null;
  pauseWhy: ArchiveStopReason;
}

/** A pause only ends the play when nothing follows for this long */
const PAUSE_GRACE_MS = 10 * 60_000;
/** Title and show are looked up after the start: wait a moment for them */
const START_DELAY_MS = 4000;

let arch: ArchivePlay | null = null;
/** The next pause of the archive element is because something else plays */
let nextPauseIsSwitch = false;

function sendArchiveStart(p: ArchivePlay) {
  if (p.startSent) return;
  p.startSent = true;
  if (p.startTimer) clearTimeout(p.startTimer);
  p.startTimer = null;
  track('listen-start-archive', { show: p.show, ep: p.ep, from: p.from, wh: weekdayHour() });
}

function archiveStop(why: ArchiveStopReason) {
  const p = arch;
  if (!p) return;
  arch = null;
  if (p.pauseTimer) clearTimeout(p.pauseTimer);
  if (p.startTimer) clearTimeout(p.startTimer);
  if (!p.sounding) return; // never played: no start, no stop
  sendArchiveStart(p);
  track('listen-stop-archive', { show: p.show, min: Math.floor(p.position / 60), why });
}

/** A new archive episode is loading (id: SoundCloud track id or "mc:<key>"). */
export function archiveLoading(id: string, fallbackArea = 'player') {
  wire();
  if (arch?.id === id) return;
  if (arch) archiveStop(arch.pauseTimer ? arch.pauseWhy : 'switch');
  liveStopped('switch');
  arch = {
    id,
    from: startOrigin(fallbackArea),
    show: '',
    ep: '',
    sounding: false,
    startSent: false,
    startTimer: null,
    milestones: new Set(),
    position: 0,
    pauseTimer: null,
    pauseWhy: 'pause',
  };
}

/** Show name and episode title, once the player knows them. */
export function archiveInfo(id: string, info: { show: string; ep: string }) {
  if (!arch || arch.id !== id) return;
  arch.show = cut(info.show || seriesName(info.ep), 60);
  arch.ep = cut(info.ep, 80);
}

/** Sound runs (first start, or on again after a pause / buffering). */
export function archiveSounding(id: string) {
  const p = arch;
  if (!p || p.id !== id) return;
  if (p.pauseTimer) {
    clearTimeout(p.pauseTimer);
    p.pauseTimer = null;
  }
  if (p.sounding) return;
  p.sounding = true;
  p.startTimer = setTimeout(() => arch === p && sendArchiveStart(p), START_DELAY_MS);
}

/** Position in the episode (seconds). Counts a minute mark when it is actually played, not skipped over. */
export function archivePosition(id: string, seconds: number) {
  const p = arch;
  if (!p || p.id !== id || !p.sounding || !Number.isFinite(seconds)) return;
  p.position = seconds;
  const minute = Math.floor(seconds / 60);
  for (const m of ARCHIVE_MILESTONES) {
    if (m === minute && !p.milestones.has(m)) {
      p.milestones.add(m);
      sendArchiveStart(p);
      track('listen-min-archive', { show: p.show, min: m, sm: `${p.show}|${m}` });
    }
  }
}

/** The archive element paused. Becomes a stop only if it doesn't play on soon. */
export function archivePaused(id: string) {
  const p = arch;
  if (!p || p.id !== id || !p.sounding) return;
  p.pauseWhy = nextPauseIsSwitch ? 'switch' : 'pause';
  nextPauseIsSwitch = false;
  if (p.pauseTimer) clearTimeout(p.pauseTimer);
  p.pauseTimer = setTimeout(() => arch === p && archiveStop(p.pauseWhy), PAUSE_GRACE_MS);
}

/** Something else (a video with sound) asks the archive to pause. */
export function archivePauseIsSwitch() {
  nextPauseIsSwitch = true;
}

export function archiveEnded(id: string) {
  if (arch?.id === id) archiveStop('ended');
}

export function archiveFailed(id: string) {
  if (arch?.id === id) archiveStop('error');
}

/** Player closed (pause) or taken over by live radio / another player (switch). */
export function archiveClosed(why: 'pause' | 'switch') {
  if (!arch) return;
  archiveStop(arch.pauseTimer ? arch.pauseWhy : why);
}

function archiveSwitched() {
  if (arch) archiveStop(arch.pauseTimer ? arch.pauseWhy : 'switch');
}

function archiveLeft() {
  if (arch) archiveStop(arch.pauseTimer ? arch.pauseWhy : 'leave');
}
