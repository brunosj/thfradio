'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TimetableV2 } from '.';
import MobileTimetable from './MobileTimetable';
import BarsSpinner from '@/app/_common/ui/BarsSpinner';
import { isChannel2Available } from '@/app/_lib/liveChannels';
import ChannelToggle from '@/app/_modules/live-radio/ChannelToggle';
import { useGlobalStore } from '@/hooks/useStore';
import { useCalendarData } from '@/hooks/useCalendarStore';
import { useTranslations } from 'next-intl';

const SCHEDULE_HASH = '#schedule';

const TimetableLoading = () => (
  <div className='w-full text-center min-h-[40lvh] flex items-center justify-center'>
    <BarsSpinner color='#ff6314' />
  </div>
);

/**
 * The two-week programme, folded out under the live ticker (sticky header,
 * every page). The ticker's "Wochenplan" button and links to "/#schedule"
 * (header menu) open it; Escape and page changes close it.
 */
const CalendarSchedule = () => {
  const { ch1, ch2, isLoading, error } = useCalendarData();
  const t = useTranslations();
  const open = useGlobalStore((s) => s.scheduleOpen);
  const setOpen = useGlobalStore((s) => s.setScheduleOpen);
  const activeTimetableChannel = useGlobalStore((state) => state.activeTimetableChannel);
  const setActiveTimetableChannel = useGlobalStore((state) => state.setActiveTimetableChannel);
  // The grid is mounted on first open (it measures itself when it mounts).
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const channel2Available = isChannel2Available(ch2);
  const activeEntries = activeTimetableChannel === 2 ? ch2 : ch1;

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (activeTimetableChannel === 2 && !channel2Available) {
      setActiveTimetableChannel(1);
    }
  }, [activeTimetableChannel, channel2Available, setActiveTimetableChannel]);

  // "/#schedule" links open the fold-out instead of navigating.
  useEffect(() => {
    if (window.location.hash === SCHEDULE_HASH) {
      setOpen(true);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const onClick = (e: MouseEvent) => {
      const isOpen = useGlobalStore.getState().scheduleOpen;
      const target = e.target as HTMLElement | null;
      // Plain left clicks only: new tab / window keeps working as usual
      const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      const a = target?.closest?.('a');
      const href = a && a.target !== '_blank' ? a.getAttribute('href') : null;
      const url = href ? new URL(href, window.location.href) : null;
      if (plain && url && url.origin === window.location.origin && url.hash === SCHEDULE_HASH) {
        // "Programm" in the menu: opens the schedule, a second click folds it in
        e.preventDefault();
        setOpen(!isOpen);
        return;
      }
      // A click anywhere else (outside the schedule and its ticker button) folds it in
      if (
        isOpen &&
        !target?.closest?.('#week-schedule') &&
        !target?.closest?.('[aria-controls="week-schedule"]')
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [setOpen]);

  // Close when the page changes (not on first load, "/#schedule" may have opened it).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <div
      // Not "schedule": the browser would jump to it for "/#schedule" links.
      id='week-schedule'
      className={`grid bg-dark-blue text-white transition-[grid-template-rows] duration-500 ease-out ${
        open ? 'grid-rows-[1fr] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]' : 'grid-rows-[0fr]'
      }`}
      inert={!open}
      aria-hidden={!open}
    >
      <div className='overflow-hidden'>
        {mounted && (
          <div className='max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain pt-4 pb-6 lg:pb-8'>
            {!isLoading && !error && channel2Available && (
              <ChannelToggle
                channel2Available={channel2Available}
                activeChannel={activeTimetableChannel}
                onChannelChange={setActiveTimetableChannel}
                variant='calendar'
              />
            )}
            {isLoading ? (
              <TimetableLoading />
            ) : error ? (
              <div className='m-auto text-center p-12 bg-red-900/20 rounded-xl border border-red-900/30 text-white'>
                {t('failedToLoad')}
              </div>
            ) : (
              <>
                <div className='hidden lg:block overflow-x-auto pb-6 pl-6 lg:pl-16'>
                  <TimetableV2 calendarEntries={activeEntries} />
                </div>
                <div className='lg:hidden px-4 pb-4'>
                  <MobileTimetable calendarEntries={activeEntries} />
                </div>
              </>
            )}
            <div className='layout flex justify-center'>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white'
              >
                {t('closeProgramme')} ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSchedule;
