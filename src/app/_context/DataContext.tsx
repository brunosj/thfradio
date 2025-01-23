'use client';

import React, { createContext, useState, useContext } from 'react';
import type {
  CloudShowTypes,
  CalendarEntry,
  ShowTypes,
  TagsList,
  NewsType,
} from '@/types/ResponsesInterface';

interface DataContextProps {
  children: React.ReactNode;
  initialData: {
    cloudShows: CloudShowTypes[];
    calendarEntries: CalendarEntry[];
    programmeShows: ShowTypes[];
    tagsList: TagsList;
    news: NewsType[];
  };
}

interface DataContextValue {
  cloudShows: CloudShowTypes[];
  news: NewsType[];
  calendarEntries: CalendarEntry[];
  programmeShows: ShowTypes[];
  tagsList: TagsList;
  refreshCalendar: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialData }: DataContextProps) {
  const [cloudShows] = useState(initialData.cloudShows);
  const [calendarEntries, setCalendarEntries] = useState(
    initialData.calendarEntries
  );
  const [programmeShows] = useState(initialData.programmeShows);
  const [news] = useState(initialData.news);
  const [tagsList] = useState(initialData.tagsList);

  const refreshCalendar = async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/fetchCalendar`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCalendarEntries(Array.isArray(data) ? data : []);
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
        programmeShows,
        tagsList,
        news,
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
