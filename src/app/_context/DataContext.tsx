'use client';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
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

// 12 hours in milliseconds - matches server-side cache
const CACHE_DURATION = 12 * 60 * 60 * 1000;

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialTagsList }: DataContextProps) {
  const [cloudShows, setCloudShows] = useState<CloudShowTypes[] | null>(null);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [showsError, setShowsError] = useState<string | null>(null);
  const [tagsList] = useState(initialTagsList);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const loadCloudShows = useCallback(async () => {
    // Clear any previous errors
    setShowsError(null);

    // Skip if already loading
    if (isLoadingShows) {
      return;
    }

    // Check if cache is still valid
    const now = Date.now();
    const cacheIsValid =
      cloudShows &&
      cloudShows.length > 0 &&
      lastFetchTime > 0 &&
      now - lastFetchTime < CACHE_DURATION;

    // If we have valid cached data, don't reload
    if (cacheIsValid) {
      return;
    }

    setIsLoadingShows(true);

    try {
      const shows = await fetchCloudShowsCached();

      if (Array.isArray(shows) && shows.length > 0) {
        setCloudShows(shows);
        setLastFetchTime(Date.now());
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
  }, [isLoadingShows, cloudShows, lastFetchTime]);

  // Load from cache immediately on mount
  useEffect(() => {
    loadCloudShows();
  }, [loadCloudShows]);

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
