'use client';

import { useState, useEffect } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import Timetable from './Timetable';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { fetchCalendar } from '@/lib/calendar';

interface ProgrammeProps {
  title: string;
  text: string;
}

const HomeProgrammeSection = ({ title, text }: ProgrammeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    const getCalendarData = async () => {
      try {
        const data = await fetchCalendar();
        setCalendarEntries(data);
        if (data.length > 0) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching calendar:', error);
        setIsLoading(false);
      }
    };

    getCalendarData();
  }, []);

  return (
    <section className='bg-thf-blue-500 sectionPb scroll-mt-24' id='programme'>
      <SectionHeader title={title} text={text} />
      <div className='flex justify-around m-auto'>
        {isLoading ? (
          <div className='m-auto text-center'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : (
          <Timetable calendarEntries={calendarEntries} />
        )}
      </div>
    </section>
  );
};

export default HomeProgrammeSection;
