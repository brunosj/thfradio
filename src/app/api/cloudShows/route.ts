import { fetchCloudShows } from "@/lib/shows";
import { NextResponse } from "next/server";

// Use route segment config for caching (no 2MB limit like unstable_cache)
// This caches the entire route response for 12 hours
// Can be invalidated via revalidatePath('/api/cloudShows')
export const revalidate = 43200; // 12 hours in seconds

export async function GET() {
  try {
    const shows = await fetchCloudShows();

    return NextResponse.json(shows, {
      status: 200,
      headers: {
        // Cache headers for CDN/browser caching
        "Cache-Control": "public, max-age=43200, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error in cloud shows API route:", error);
    // Return empty array with 200 status to not break UI
    return NextResponse.json(
      {
        shows: [],
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
      },
    );
  }
}
