"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import type { CloudShowTypes, TagsList } from "@/types/ResponsesInterface";
import { fetchCloudShowsCached } from "@/lib/shows";

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadCloudShows = async () => {
    // Skip if already loading
    if (isLoadingShows) {
      return;
    }

    // Skip if already have data
    if (cloudShows && cloudShows.length > 0) {
      return;
    }

    setIsLoadingShows(true);
    setShowsError(null);

    try {
      const shows = await fetchCloudShowsCached();

      if (Array.isArray(shows) && shows.length > 0) {
        setCloudShows(shows);
      } else {
        const msg = "No shows returned from API";
        console.warn("[CloudShows]", msg);
        setShowsError(msg);
        setCloudShows([]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("[CloudShows] Error:", msg);
      setShowsError(msg);
      setCloudShows([]);
    } finally {
      setIsLoadingShows(false);
    }
  };

  // Load on mount only
  useEffect(() => {
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
      loadCloudShows();
    }
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
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
