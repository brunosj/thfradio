'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Marquee from 'react-fast-marquee';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { enUS, de } from 'date-fns/locale';
import { ArrowRightLong } from '@/common/assets/ArrowRightLong';
import AudioPlayer, { AudioPlayerRef } from '@/modules/live-radio/AudioPlayer';
import LiveCircle from '@/common/assets/LiveCircle';
import { fetchCalendar } from '@/lib/calendar';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

export default function LiveTicker() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = pathname?.startsWith('/de') ? 'de' : 'en';
  const localeModule = locale === 'de' ? de : enUS;
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  // Get the active player from global store
  const activePlayer = useGlobalStore((state) => state.activePlayer);

  const refreshCalendar = async () => {
    try {
      const data = await fetchCalendar();
      setCalendarEntries(data);
    } catch (error) {
      console.error('Error refreshing calendar:', error);
      setCalendarEntries([]);
    }
  };

  useEffect(() => {
    refreshCalendar();
    // Refresh calendar every minute
    const interval = setInterval(() => {
      refreshCalendar();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Effect to pause LiveTicker audio when Mixcloud or Soundcloud players are active
  useEffect(() => {
    if (
      audioPlayerRef.current &&
      (activePlayer === ActivePlayer.MIXCLOUD ||
        activePlayer === ActivePlayer.SOUNDCLOUD)
    ) {
      audioPlayerRef.current.pause();
    }
  }, [activePlayer]);

  const getCurrentShowName = () => {
    const now = new Date();
    const currentShow = calendarEntries.find((entry) => {
      const showStart = new Date(entry.start);
      const showEnd = new Date(entry.end);
      return isWithinInterval(now, { start: showStart, end: showEnd });
    });

    const nextShow = calendarEntries.find((entry) => {
      const showStart = parseISO(entry.start);
      return showStart > now;
    });

    if (!currentShow && !nextShow) {
      return <span>{/* <BarsSpinner color='#1200ff' /> */}</span>;
    }

    if (currentShow) {
      const formattedStartHour = format(new Date(currentShow.start), 'HH:mm', {
        locale: localeModule,
      });
      const formattedEndHour = format(new Date(currentShow.end), 'HH:mm', {
        locale: localeModule,
      });
      // const nextShowStart = nextShow
      //   ? format(parseISO(nextShow.start), 'EEEE, MMMM dd, yyyy', {
      //       locale: localeModule,
      //     })
      //   : '';
      const nextShowStartTime = nextShow
        ? format(parseISO(nextShow.start), 'HH:mm', {
            locale: localeModule,
          })
        : '';
      const nextShowEndTime = nextShow
        ? format(parseISO(nextShow.end), 'HH:mm', {
            locale: localeModule,
          })
        : '';

      return (
        <div className='uppercase text-sm lg:text-base space-x-3 flex items-center'>
          <LiveCircle className='w-6 h-6 animate-pulse ml-4' />
          <span>{currentShow.summary}</span>
          <span>
            {formattedStartHour}-{formattedEndHour}
          </span>
          {nextShow &&
            format(parseISO(nextShow.start), 'yyyy-MM-dd') ===
              format(new Date(currentShow.start), 'yyyy-MM-dd') && (
              <>
                <span className='px-12'>
                  <ArrowRightLong />
                </span>
                <span>{t('nextShow')}:</span>
                <span>{nextShow.summary}</span>
                <span>
                  {nextShowStartTime}-{nextShowEndTime}
                </span>
                <span className='px-12'>
                  <ArrowRightLong />
                </span>
              </>
            )}
        </div>
      );
    }

    // No current show, display next show info
    const nextShowDate = nextShow
      ? format(parseISO(nextShow.start), 'EEEE dd.MM.yyyy', {
          locale: localeModule,
        })
      : '';

    return (
      <span className='text-sm italic px-6'>
        <span className='uppercase'>
          {t('archivePlaying')}
          {' // '}
        </span>
        {nextShow && (
          <span>
            {t('nextShow')} {t('on')} {nextShowDate}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className='fixed top-16 z-50 w-full bg-white opacity-100 border-b border-thf-blue-500'>
      <div className='layout h-full font-mono flex items-center space-x-3 justify-between flex-col lg:flex-row'>
        <div className='hidden lg:block w-full lg:w-1/3 xl:w-1/4 py-2 lg:py-0 space-x-2 text-xs lg:text-sm whitespace-pre'>
          <span className='uppercase font-light'>Live from Airport Berlin</span>
          <span className='uppercase font-semibold italic'>Now Playing:</span>
        </div>
        <div className='w-full lg:w-4/6 min-h-full'>
          <Marquee
            gradient={false}
            gradientWidth={25}
            speed={50}
            pauseOnHover={true}
          >
            <div>{getCurrentShowName()}</div>
          </Marquee>
        </div>
        <div className='hidden lg:block ml-auto'>
          <AudioPlayer
            ref={audioPlayerRef}
            iconClassName='w-6 h-6 lg:w-10 lg:h-10'
            iconFill='#1200ff'
            audioSrc={
              process.env.NEXT_PUBLIC_LIVE_RADIO_STREAM ||
              'https://thf-radio-7ec0e6ee.radiocult.fm/stream'
            }
          />
        </div>
      </div>
    </div>
  );
}
