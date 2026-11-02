// Can this browser decode AAC audio? Nearly all can; the preview browser in
// VS Code can't (its Chromium ships without an AAC decoder). SoundCloud then
// plays as MP3 (lib/archiveAudio), Mixcloud (AAC only) can't play at all.
// Tested once per page by decoding 0.1 s of AAC; anything unclear counts as yes.

/** 0.1 s of a quiet tone, AAC in ADTS (425 bytes) */
const SNIPPET =
  '//lcYAFgAADQAAf/+VxgFOAAASIXroQgy/z8L0V9c4T1eUFtruWzDxDwEMVxPmgmZ2QINawSRGkY6qCnkMU8nhrRCzjicDNkjaAjgsySz1ghwIBP4UeliH0B/PSQ+xXson4f9HErvRSO23ZLgN6iN0T1NMhksMTrYwgbEkSXyUieRpMlqqQsKJzo5CBNyvNn4H3H0L3Cpx/+GDhkwPDeNtk9B6o0flC46Wp2qqsi7nr6OP/5XGAKoAABFBeQ8kBJhIhkARlAQhAIjAjyZleN+7/8YgxMRQDjDyUrdAwPk01/OfR5xBKM1Q8lGDrAvu+7UUGjQXEAA72xBQKgASAsAABvNoAAgcD/+VxgDMAAASIXqWh4EiQk+8VM+XeOuLuX56WXAttfy2kSSRwa6cY2OoUlfhs4kbHpiB3LAHD56vMNkaSNIPqHyJZGkHwEJv5DOPgriSwGkjEV8m6KRHAPMNkS0dnfsLVSVhbgO4D/+VxgB4AAASAXmYiA26a7Mgu9XaFtrjcS4fEPEAOrFJSjixOaV2aO7bx7aUdFWOslSSVENqmipJKiG8A=';

let result: Promise<boolean> | null = null;

export function canDecodeAac(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true);
  result ??= new Promise<boolean>((resolve) => {
    try {
      const Ctx =
        window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (!Ctx) return resolve(true);
      const bytes = Uint8Array.from(atob(SNIPPET), (c) => c.charCodeAt(0));
      // Callback form: older Safari has no promise here
      const maybe = new Ctx(1, 1, 44100).decodeAudioData(
        bytes.buffer,
        () => resolve(true),
        () => resolve(false),
      ) as Promise<AudioBuffer> | undefined;
      maybe?.catch(() => {});
    } catch {
      resolve(true);
    }
  });
  return result;
}
