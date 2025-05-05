'use client';

import { useState, useEffect } from 'react';
import { useTransition } from 'react';

import type { CalendarEntry } from '@/types/ResponsesInterface';
import Timetable from './Timetable';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { fetchCalendar } from '@/lib/calendar';

// Loading fallback component
const TimetableLoading = () => (
  <div className='m-auto text-center'>
    <BarsSpinner color='#ff6314' />
  </div>
);

const HomeProgrammeSection = () => {
  const [isPending, startTransition] = useTransition();
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <section className='bg-dark-blue pt-12 scroll-mt-24' id='programme'>
      {/* <SectionHeader title={title} text={text} /> */}
      <div className='pt-6 lg:pt-12 flex justify-around m-auto min-h-[60lvh]'>
        {isLoading || isPending ? (
          <TimetableLoading />
        ) : error ? (
          <div className='m-auto text-center text-white'>
            Failed to load programme data. Please try again later.
          </div>
        ) : (
          <Timetable calendarEntries={calendarEntries} />
        )}
      </div>
    </section>
  );
};

export default HomeProgrammeSection;
