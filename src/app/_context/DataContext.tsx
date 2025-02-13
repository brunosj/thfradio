'use client';

import React, { createContext, useState, useContext } from 'react';
import type { CloudShowTypes, TagsList } from '@/types/ResponsesInterface';

interface DataContextProps {
  children: React.ReactNode;
  initialData: {
    cloudShows: CloudShowTypes[];
    tagsList: TagsList;
  };
}

interface DataContextValue {
  cloudShows: CloudShowTypes[];
  tagsList: TagsList;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialData }: DataContextProps) {
  const [cloudShows] = useState(initialData.cloudShows);
  const [tagsList] = useState(initialData.tagsList);

  return (
    <DataContext.Provider
      value={{
        cloudShows,
        tagsList,
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
