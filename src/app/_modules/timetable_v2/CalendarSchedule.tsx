'use client';

import { useEffect } from 'react';
import { TimetableV2 } from '.';
import MobileTimetable from './MobileTimetable';
import BarsSpinner from '@/app/_common/ui/BarsSpinner';
import { isChannel2Available } from '@/app/_lib/liveChannels';
import ChannelToggle from '@/app/_modules/live-radio/ChannelToggle';
import { useGlobalStore } from '@/hooks/useStore';
import { useCalendarData } from '@/hooks/useCalendarStore';
import { useTranslations } from 'next-intl';
import SectionHeader from '@/common/layout/section/SectionHeader';

export type CalendarScheduleProps = {
  /** CMS homepage programme block; falls back to i18n when empty */
  programmeTitle?: string;
  programmeText?: string;
  programmeTextHtml?: string;
};

const TimetableLoading = () => (
  <div className='w-full text-center  min-h-[60lvh]  flex items-center justify-center'>
    <BarsSpinner color='#ff6314' />
  </div>
);

const CalendarSchedule = ({
  programmeTitle,
  programmeText,
  programmeTextHtml,
}: CalendarScheduleProps = {}) => {
  const { ch1, ch2, isLoading, error } = useCalendarData();
  const t = useTranslations();
  const activeTimetableChannel = useGlobalStore(
    (state) => state.activeTimetableChannel,
  );
  const setActiveTimetableChannel = useGlobalStore(
    (state) => state.setActiveTimetableChannel,
  );

  const channel2Available = isChannel2Available(ch2);
  const activeEntries = activeTimetableChannel === 2 ? ch2 : ch1;

  useEffect(() => {
    if (activeTimetableChannel === 2 && !channel2Available) {
      setActiveTimetableChannel(1);
    }
  }, [activeTimetableChannel, channel2Available, setActiveTimetableChannel]);

  const title = programmeTitle?.trim() ? programmeTitle.trim() : t('programme');
  const textHtml = programmeTextHtml?.trim() ? programmeTextHtml : undefined;
  const subtitleText =
    textHtml === undefined ? programmeText?.trim() || t('upcomingShows') : '';

  return (
    <section
      className='bg-dark-blue py-4 lg:py-8 scroll-mt-24 text-white'
      id='schedule'
    >
      {/* <SectionHeader title={title} text={subtitleText} textHtml={textHtml} /> */}

      {!isLoading && !error && channel2Available && (
        <ChannelToggle
          channel2Available={channel2Available}
          activeChannel={activeTimetableChannel}
          onChannelChange={setActiveTimetableChannel}
          variant='calendar'
        />
      )}

      <div className=''>
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
      </div>
    </section>
  );
};

export default CalendarSchedule;
