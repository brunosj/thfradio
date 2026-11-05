import type { CalendarEntry } from '@/types/ResponsesInterface';

/**
 * Both channels come from our own streaming server (thfradio.space:
 * liquidsoap → Icecast). Fixed on purpose, not read from .env, so an old
 * Radio Cult address left in a server .env can't come back. ?ref=web tells
 * the streaming server these listeners came through thfradio.de.
 */
export const LIVE_CHANNELS = {
  1: {
    id: 1 as const,
    label: 'THF1',
    streamUrl: 'https://stream.thfradio.space/live.mp3?ref=web',
  },
  2: {
    id: 2 as const,
    label: 'THF2',
    streamUrl: 'https://stream.thfradio.space/live2.mp3?ref=web',
  },
} as const;

export type LiveChannelId = keyof typeof LIVE_CHANNELS;

/** Matches the number of day columns shown in the timetable UI. */
export const TIMETABLE_VISIBLE_DAYS = 6;

export function getLiveChannelStreamUrl(channelId: LiveChannelId): string {
  return LIVE_CHANNELS[channelId].streamUrl;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True when a channel has a show airing right now. */
export function isChannelLiveNow(
  entries: CalendarEntry[],
  now = new Date(),
): boolean {
  return entries.some((entry) => {
    const startIso = entry.startTime ?? entry.start;
    const endIso = entry.endTime ?? entry.end;
    if (!startIso || !endIso) return false;
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      return now >= start && now < end;
    } catch {
      return false;
    }
  });
}

/** True when THF2 has at least one show starting within the visible timetable window. */
export function isChannel2Available(
  entries: CalendarEntry[],
  visibleDays: number = TIMETABLE_VISIBLE_DAYS,
): boolean {
  const windowStart = startOfDay(new Date());
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + visibleDays - 1);
  windowEnd.setHours(23, 59, 59, 999);

  return entries.some((entry) => {
    const startIso = entry.startTime ?? entry.start;
    if (!startIso) return false;
    const start = new Date(startIso);
    return start >= windowStart && start <= windowEnd;
  });
}
