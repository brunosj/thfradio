'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import type { CloudShowTypes, TagsList } from '@/types/ResponsesInterface';
import { fetchCloudShowsCached } from '@/lib/shows';

interface DataContextProps {
  children: React.ReactNode;
  initialTagsList: TagsList;
}

interface DataContextValue {
  cloudShows: CloudShowTypes[] | null;
  isLoadingShows: boolean;
  showsError: string | null;
  tagsList: TagsList;
  loadCloudShows: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialTagsList }: DataContextProps) {
  const [cloudShows, setCloudShows] = useState<CloudShowTypes[] | null>(null);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [showsError, setShowsError] = useState<string | null>(null);
  const [tagsList] = useState(initialTagsList);

  const loadCloudShows = async () => {
    // Clear any previous errors
    setShowsError(null);

    // Skip if already loading
    if (isLoadingShows) {
      console.log('Already loading shows, skipping duplicate request');
      return;
    }

    // If we have data already, don't reload unless forced
    if (cloudShows && cloudShows.length > 0) {
      console.log('Shows already loaded, using cached data', cloudShows.length);
      return;
    }

    console.log('Loading cloud shows...');
    setIsLoadingShows(true);

    try {
      const shows = await fetchCloudShowsCached();

      if (Array.isArray(shows) && shows.length > 0) {
        console.log(`Successfully loaded ${shows.length} shows`);
        setCloudShows(shows);
      } else {
        const errorMsg = 'Fetched shows array is empty or invalid';
        console.warn(errorMsg);
        setShowsError(errorMsg);
        setCloudShows([]);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error loading shows';
      console.error('Error loading cloud shows:', errorMsg);
      setShowsError(errorMsg);
      setCloudShows([]);
    } finally {
      setIsLoadingShows(false);
    }
  };

  // Load from cache immediately on mount
  useEffect(() => {
    loadCloudShows();
  }, []);

  return (
    <DataContext.Provider
      value={{
        cloudShows,
        isLoadingShows,
        showsError,
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
