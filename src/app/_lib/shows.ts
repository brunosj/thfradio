import type { CloudShowTypes, ShowTypes } from "@/types/ResponsesInterface";
import { fetchMixcloudShows } from "./mixcloud";
import { fetchSoundcloudShows } from "./soundcloud";

type ShowsType = {
  data: ShowTypes[];
};

export async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  console.log("fetchCloudShows: Starting fetch");
  // Fetch Mixcloud shows first with caching
  const mixcloudShows = await fetchMixcloudShows().catch((error) => {
    console.error("Error fetching Mixcloud shows:", error);
    return [];
  });
  console.log("fetchCloudShows: Mixcloud shows:", mixcloudShows.length, "items");

  // Then try to fetch Soundcloud shows with caching
  let soundcloudShows: CloudShowTypes[] = [];
  try {
    // Check if SoundCloud environment variables are set
    if (
      !process.env.SOUNDCLOUD_CLIENT_ID ||
      !process.env.SOUNDCLOUD_CLIENT_SECRET ||
      !process.env.SOUNDCLOUD_USER_ID
    ) {
      console.error("SoundCloud environment variables missing");
    }

    soundcloudShows = await fetchSoundcloudShows();
    console.log("fetchCloudShows: Soundcloud shows:", soundcloudShows.length, "items");
  } catch (error) {
    console.error("Error fetching Soundcloud shows:", error);
  }

  const shows = [...mixcloudShows, ...soundcloudShows];
  console.log("fetchCloudShows: Total shows:", shows.length);

  return shows;
}

// Client-side function to fetch cloud shows from the API
// Server-side caching is handled by unstable_cache in the API route
export async function fetchCloudShowsCached(): Promise<CloudShowTypes[]> {
  try {
    // Check if we're on the server side
    const isServer = typeof window === "undefined";
    console.log("fetchCloudShowsCached: isServer =", isServer);

    if (isServer) {
      // On server side, call the function directly to avoid HTTP overhead
      // The API route uses unstable_cache for proper caching
      console.log("fetchCloudShowsCached: Using server-side fetch");
      return await fetchCloudShows();
    }

    // On client side, fetch from API
    // The API route handles caching with proper cache tags
    console.log("fetchCloudShowsCached: Fetching from /api/cloudShows");
    const response = await fetch("/api/cloudShows");
    console.log("fetchCloudShowsCached: API response status:", response.status);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("fetchCloudShowsCached: API response data:", data);

    // Handle the new response format which might include error information
    if (data.error) {
      console.error("API returned error:", data.error);
      return data.shows || [];
    }

    // Handle the original array format
    const shows = Array.isArray(data) ? data : data.shows || [];
    console.log("fetchCloudShowsCached: Returning shows:", shows.length, "items");

    return shows;
  } catch (error) {
    console.error("Error fetching cloud shows:", error);
    // In case of errors, return empty array
    return [];
  }
}

export async function fetchProgrammeShows(locale: string) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/shows?lang=${locale}`, {
      next: { revalidate: 300 },
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching programme shows:", error);
    return [];
  }
}

export async function fetchShowBySlug(slug: string, locale: string) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/shows/${slug}?lang=${locale}`, {
      next: { revalidate: 600 },
    });
    return await response.json();
  } catch (error) {
    console.error(`Error fetching show by slug ${slug}:`, error);
    return null;
  }
}
