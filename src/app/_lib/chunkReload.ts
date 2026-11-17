// A page that was open across a website deploy (or on a very slow line) can fail to load a
// piece of JavaScript it needs later ("ChunkLoadError: Loading chunk … failed"): the old
// file name is gone or the download timed out. A fresh load of the page fixes that, so we
// reload once instead of showing an error page – but not while the radio is playing (a
// reload would cut the listener off) and at most once a minute (no reload loop when the
// file really is missing). Then the error is reported as usual.

const KEY = 'thf-chunk-reload-at';
const MIN_GAP_MS = 60_000;

/** "ChunkLoadError", "Loading chunk 6659 failed", "Loading CSS chunk …", or Vite/ESM wording. */
export function isChunkLoadError(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return (
    name === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(message)
  );
}

function radioIsPlaying(): boolean {
  return Array.from(document.querySelectorAll('audio, video')).some(
    (el) => !(el as HTMLMediaElement).paused && !(el as HTMLMediaElement).ended
  );
}

/**
 * For a chunk error: reload the page once and return true (the caller then does nothing
 * else). Returns false when it isn't a chunk error, the radio plays, or we already reloaded
 * in the last minute – the caller reports the error as before.
 */
export function reloadOnChunkError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error) || radioIsPlaying()) return false;
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // no sessionStorage (private mode, blocked): no loop guard, so no reload
  }
  window.location.reload();
  return true;
}
