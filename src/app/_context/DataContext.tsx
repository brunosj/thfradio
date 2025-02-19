'use client';

import React, { createContext, useState, useContext } from 'react';
import type { CloudShowTypes, TagsList } from '@/types/ResponsesInterface';
import { fetchCloudShowsCached } from '@/lib/shows';

interface DataContextProps {
  children: React.ReactNode;
  initialTagsList: TagsList;
}

interface DataContextValue {
  cloudShows: CloudShowTypes[] | null;
  isLoadingShows: boolean;
  tagsList: TagsList;
  loadCloudShows: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialTagsList }: DataContextProps) {
  const [cloudShows, setCloudShows] = useState<CloudShowTypes[] | null>(null);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [tagsList] = useState(initialTagsList);

  const loadCloudShows = async () => {
    if (cloudShows || isLoadingShows) return;

    setIsLoadingShows(true);
    try {
      const shows = await fetchCloudShowsCached();
      setCloudShows(Array.isArray(shows) ? shows : []);
    } catch (error) {
      console.error('Error loading cloud shows:', error);
      setCloudShows([]);
    } finally {
      setIsLoadingShows(false);
    }
  };

  return (
    <DataContext.Provider
      value={{
        cloudShows,
        isLoadingShows,
        tagsList,
        loadCloudShows,
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
