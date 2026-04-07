'use client';

import { useState, useEffect, useTransition } from 'react';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import { TimetableV2 } from '.';
import BarsSpinner from '@/app/_common/ui/BarsSpinner';
import { fetchCalendar } from '@/app/_lib/calendar';
import { useTranslations } from 'next-intl';
import SectionHeader from '@/common/layout/section/SectionHeader';

export type CalendarScheduleProps = {
  /** CMS homepage programme block; falls back to i18n when empty */
  programmeTitle?: string;
  programmeText?: string;
  programmeTextHtml?: string;
};

// Loading fallback component
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
  const [isPending, startTransition] = useTransition();
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const t = useTranslations();

  // Use React 18's useTransition for non-blocking data fetching
  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await fetchCalendar();
        setCalendarEntries(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching calendar:', err);
        setError(true);
        setIsLoading(false);
      }
    });
  }, []); // Empty dependency array to run only once on mount

  const title = programmeTitle?.trim() ? programmeTitle.trim() : t('programme');
  const textHtml = programmeTextHtml?.trim() ? programmeTextHtml : undefined;
  const subtitleText =
    textHtml === undefined ? programmeText?.trim() || t('upcomingShows') : '';

  return (
    <section
      className='bg-dark-blue py-8 scroll-mt-24 text-white'
      id='schedule'
    >
      <SectionHeader title={title} text={subtitleText} textHtml={textHtml} />

      <div className=''>
        {isLoading || isPending ? (
          <TimetableLoading />
        ) : error ? (
          <div className='m-auto text-center p-12 bg-red-900/20 rounded-xl border border-red-900/30 text-white'>
            {t('failedToLoad')}
          </div>
        ) : (
          <div className='overflow-x-auto pb-6 pl-6 lg:pl-16'>
            <TimetableV2 calendarEntries={calendarEntries} />
          </div>
        )}
      </div>
    </section>
  );
};

export default CalendarSchedule;
