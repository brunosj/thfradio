'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import type { CalendarEntry } from '@/app/_types/ResponsesInterface';
import MobileDayTabs from './MobileDayTabs';
import MobileShowList from './MobileShowList';
import {
  findNextDayWithShows,
  generateTwoWeekRange,
  groupEntriesByDay,
} from './utils';

interface MobileTimetableProps {
  calendarEntries: CalendarEntry[];
}

export default function MobileTimetable({
  calendarEntries,
}: MobileTimetableProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const hasAppliedInitialFallback = useRef(false);

  const days = useMemo(() => generateTwoWeekRange(), []);

  const entriesByDay = useMemo(
    () => groupEntriesByDay(calendarEntries, days),
    [calendarEntries, days],
  );

  const selectedDayEntries = useMemo(() => {
    const match = entriesByDay.find((group) =>
      isSameDay(group.date, selectedDay),
    );
    return match?.events ?? [];
  }, [entriesByDay, selectedDay]);

  const handleSelectDay = (day: Date) => {
    setSelectedDay(startOfDay(day));
  };

  // On first load only: if today has no shows, jump to the next day with shows.
  useEffect(() => {
    if (hasAppliedInitialFallback.current) return;
    hasAppliedInitialFallback.current = true;

    const todayGroup = entriesByDay.find((group) =>
      isSameDay(group.date, today),
    );
    if (todayGroup?.events.length) return;

    const nextDay = findNextDayWithShows(days, entriesByDay, today);
    if (nextDay) {
      setSelectedDay(startOfDay(nextDay));
    }
  }, [entriesByDay, days, today]);

  return (
    <div className='w-full  bg-dark-blue'>
      <div className='p-3'>
        <MobileDayTabs
          days={days}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
        />
        <MobileShowList
          entries={selectedDayEntries}
          days={days}
          selectedDay={selectedDay}
          entriesByDay={entriesByDay}
          onSelectDay={handleSelectDay}
        />
      </div>
    </div>
  );
}
