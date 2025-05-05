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
  hasError: boolean;
  tagsList: TagsList;
  loadCloudShows: () => Promise<void>;
  retryLoadingShows: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, initialTagsList }: DataContextProps) {
  const [cloudShows, setCloudShows] = useState<CloudShowTypes[] | null>(null);
  const [isLoadingShows, setIsLoadingShows] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [tagsList] = useState(initialTagsList);

  const loadCloudShows = async () => {
    // Don't fetch if already loading or if we have data already
    if (isLoadingShows || (cloudShows && cloudShows.length > 0)) return;

    setIsLoadingShows(true);
    setHasError(false);

    try {
      const shows = await fetchCloudShowsCached();
      if (Array.isArray(shows) && shows.length > 0) {
        setCloudShows(shows);
      } else {
        console.warn('Fetched shows array is empty or invalid');
        setHasError(true);
        setCloudShows([]);
      }
    } catch (error) {
      console.error('Error loading cloud shows:', error);
      setHasError(true);
      setCloudShows([]);
    } finally {
      setIsLoadingShows(false);
    }
  };

  const retryLoadingShows = async () => {
    // Force a fresh reload by clearing localStorage cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cloudShowsCache');
      localStorage.removeItem('cloudShowsCacheTime');
    }

    setCloudShows(null);
    await loadCloudShows();
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
        hasError,
        tagsList,
        loadCloudShows,
        retryLoadingShows,
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
