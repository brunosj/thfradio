// File: Example.tsx
import React from 'react';
import { TimetableSection } from '.';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';

// Sample calendar data
const sampleCalendarEntries: CalendarEntry[] = [
  {
    start: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    summary: 'Morning Show with DJ Alice',
  },
  {
    start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    summary: 'Afternoon Beats with Bob',
  },
  {
    start: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    summary: 'Evening Jazz Session',
  },
  {
    start: new Date(
      new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
        13,
        0,
        0,
        0
      )
    ).toISOString(),
    end: new Date(
      new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
        15,
        0,
        0,
        0
      )
    ).toISOString(),
    summary: 'Tech House Mix with Charlie',
  },
  {
    start: new Date(
      new Date(new Date().setDate(new Date().getDate() + 2)).setHours(
        19,
        0,
        0,
        0
      )
    ).toISOString(),
    end: new Date(
      new Date(new Date().setDate(new Date().getDate() + 2)).setHours(
        22,
        0,
        0,
        0
      )
    ).toISOString(),
    summary: 'Deep House Night',
  },
];

export default function TimetableExample() {
  return (
    <div className='container mx-auto py-10'>
      <h1 className='text-3xl font-bold mb-8'>Radio Programme</h1>
      <TimetableSection
        title='Weekly Schedule'
        description='Check out our upcoming shows for the next two weeks'
        calendarEntries={sampleCalendarEntries}
      />
    </div>
  );
}
