'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import { fetchBothCalendars } from '@/lib/calendar';
import { getMsUntilNextShowBoundary } from '@/modules/live-ticker/liveTickerUtils';

const POLL_INTERVAL_MS = 60_000;

interface CalendarStore {
  ch1: CalendarEntry[];
  ch2: CalendarEntry[];
  isLoading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

let pollIntervalId: ReturnType<typeof setInterval> | null = null;
let boundaryTimeoutId: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;

function scheduleBoundaryRefresh(
  ch1: CalendarEntry[],
  ch2: CalendarEntry[],
  refresh: () => Promise<void>,
) {
  if (boundaryTimeoutId !== null) {
    clearTimeout(boundaryTimeoutId);
    boundaryTimeoutId = null;
  }

  const ms = getMsUntilNextShowBoundary([ch1, ch2]);
  if (ms === null) return;

  boundaryTimeoutId = setTimeout(() => {
    boundaryTimeoutId = null;
    void refresh();
  }, ms);
}

function startPolling(refresh: () => Promise<void>) {
  if (pollIntervalId !== null) return;

  void refresh();
  pollIntervalId = setInterval(() => {
    void refresh();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  if (boundaryTimeoutId !== null) {
    clearTimeout(boundaryTimeoutId);
    boundaryTimeoutId = null;
  }
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  ch1: [],
  ch2: [],
  isLoading: true,
  error: false,

  refresh: async () => {
    try {
      const { ch1, ch2 } = await fetchBothCalendars();
      set({ ch1, ch2, isLoading: false, error: false });
      scheduleBoundaryRefresh(ch1, ch2, get().refresh);
    } catch (error) {
      console.error('Error refreshing calendars:', error);
      set({ ch1: [], ch2: [], isLoading: false, error: true });
    }
  },
}));

export function useCalendarData(options?: { enablePolling?: boolean }) {
  const ch1 = useCalendarStore((state) => state.ch1);
  const ch2 = useCalendarStore((state) => state.ch2);
  const isLoading = useCalendarStore((state) => state.isLoading);
  const error = useCalendarStore((state) => state.error);
  const refresh = useCalendarStore((state) => state.refresh);
  const enablePolling = options?.enablePolling ?? false;

  useEffect(() => {
    if (enablePolling) {
      subscriberCount += 1;
      if (subscriberCount === 1) {
        startPolling(refresh);
      }

      return () => {
        subscriberCount -= 1;
        if (subscriberCount === 0) {
          stopPolling();
        }
      };
    }

    if (useCalendarStore.getState().isLoading) {
      void refresh();
    }
  }, [enablePolling, refresh]);

  return { ch1, ch2, isLoading, error, refresh };
}
