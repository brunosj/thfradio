'use client';

import { useEffect, type RefObject } from 'react';
import { useGlobalStore } from '@/hooks/useStore';

/**
 * When the programme opens, scroll it to the show that is on air (or the next
 * one), so a long day doesn't start at 08:00. Shows mark themselves with
 * data-start / data-end (ms); the scroll box is [data-schedule-scroller].
 */
export function useScrollToLive(
  rootRef: RefObject<HTMLElement | null>,
  ready: boolean,
) {
  const open = useGlobalStore((s) => s.scheduleOpen);

  useEffect(() => {
    if (!open || !ready) return;
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const now = Date.now();
      let live: HTMLElement | null = null;
      let next: HTMLElement | null = null;
      let nextStart = Infinity;
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-start][data-end]'))) {
        if (!el.offsetParent) continue; // hidden (other layout)
        const start = Number(el.dataset.start);
        const end = Number(el.dataset.end);
        if (start <= now && now < end) {
          live = el;
          break;
        }
        if (start > now && start < nextStart) {
          next = el;
          nextStart = start;
        }
      }
      const target = live ?? next;
      if (!target) return;
      const scroller = target.closest<HTMLElement>('[data-schedule-scroller]');
      if (!scroller) return;
      const offset =
        target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      // Leave a little room above, so the show doesn't stick to the edge
      scroller.scrollTop += offset - 72;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, ready, rootRef]);
}
