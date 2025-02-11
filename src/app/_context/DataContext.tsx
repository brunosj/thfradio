'use client';

import React, { createContext, useState, useContext } from 'react';
import type {
  CloudShowTypes,
  CalendarEntry,
  TagsList,
} from '@/types/ResponsesInterface';
import { fetchCalendar } from '@/lib/calendar';

interface DataContextProps {
  children: React.ReactNode;
  initialData: {
    cloudShows: CloudShowTypes[];
    calendarEntries: CalendarEntry[];
    tagsList: TagsList;
  };
}

interface DataContextValue {
  cloudShows: CloudShowTypes[];
  calendarEntries: CalendarEntry[];
  tagsList: TagsList;
  refreshCalendar: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialData }: DataContextProps) {
  const [cloudShows] = useState(initialData.cloudShows);
  const [calendarEntries, setCalendarEntries] = useState(
    initialData.calendarEntries
  );
  const [tagsList] = useState(initialData.tagsList);

  const refreshCalendar = async () => {
    try {
      const data = await fetchCalendar();
      setCalendarEntries(data);
    } catch (error) {
      console.error('Error refreshing calendar:', error);
      setCalendarEntries([]);
    }
  };

  return (
    <DataContext.Provider
      value={{
        cloudShows,
        calendarEntries,
        tagsList,
        refreshCalendar,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
