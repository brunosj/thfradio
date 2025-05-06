import React from 'react';
import TimetableV2 from './Timetable';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

interface TimetableSectionProps {
  title?: string;
  description?: string;
  calendarEntries: CalendarEntry[];
}

export default function TimetableSection({
  title = 'Schedule',
  description = 'Check out our upcoming shows',
  calendarEntries = [],
}: TimetableSectionProps) {
  return (
    <section className='py-8'>
      <div className='container mx-auto px-4'>
        {title && (
          <h2 className='text-2xl md:text-3xl font-bold mb-2'>{title}</h2>
        )}
        {description && <p className='text-gray-600 mb-6'>{description}</p>}

        <div className='w-full'>
          <TimetableV2 calendarEntries={calendarEntries} />
        </div>
      </div>
    </section>
  );
}
