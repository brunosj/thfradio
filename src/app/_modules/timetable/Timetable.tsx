// File: Timetable.tsx
import React, { useMemo } from 'react';
import groupByDate from './groupByDate';
import DateEntry from './DateEntry';
import type { CalendarEntry } from '@/types/ResponsesInterface';

interface TimetableProps {
  calendarEntries: CalendarEntry[];
}

const Timetable = ({ calendarEntries }: TimetableProps) => {
  // Memoize grouped entries to prevent unnecessary recalculations
  const groupedEntries = useMemo(
    () => groupByDate(calendarEntries),
    [calendarEntries]
  );

  return (
    <div className='layout space-y-3 lg:space-y-6 w-full max-w-full xl:max-w-[80%] '>
      {Object.entries(groupedEntries).map(([date, entriesForDate], index) => (
        <DateEntry key={index} date={date} entriesForDate={entriesForDate} />
      ))}
    </div>
  );
};

// Memoize the entire component to prevent re-renders when props haven't changed
export default React.memo(Timetable);
