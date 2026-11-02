import type {
  CloudShowTypes,
  MixcloudShowType,
  CloudShowTag,
} from "@/types/ResponsesInterface";
import { cleanGenres } from "@/utils/genres";

function normalizeMixcloudShow(show: MixcloudShowType): CloudShowTypes {
  // Ensure the tags array is properly formatted
  let formattedTags: CloudShowTag[] = [];

  if (show.tags && Array.isArray(show.tags) && show.tags.length > 0) {
    formattedTags = show.tags.map((tag) => {
      // Make sure tags follow the same format as the Soundcloud tags
      // for consistency across platforms
      return {
        key: tag.key.toLowerCase(),
        name: tag.name,
        // Replace spaces with hyphens in the URL path for consistency
        url: `tag/${tag.key.toLowerCase().replace(/\s+/g, "-")}`,
      };
    });
  }

  const picture = show.pictures?.extra_large || "";

  return {
    id: show.key,
    name: show.name,
    url: show.url,
    key: show.key,
    platform: "mixcloud",
    picture,
    // Only the size the site uses (Mixcloud sends ten), keeps the payload small
    pictures: { extra_large: picture },
    tags: formattedTags,
    // Mixcloud tags are its genres
    // More than shown: shows.ts drops non-genres, then keeps 6
    genres: cleanGenres(formattedTags.map((t) => t.name), 12),
    durationSec: show.audio_length ?? null,
    date: show.created_time ?? new Date().toISOString(),
  };
}

/**
 * All THF Radio uploads on Mixcloud (about 2,400 in 2026). `complete` is
 * false when a page couldn't be read, so a short list doesn't replace a good one.
 */
export async function fetchMixcloudShows(): Promise<{ shows: CloudShowTypes[]; complete: boolean }> {
  const limit = 100;
  // Safety stop only; the loop ends at the last page
  const maxItems = 6000;
  const maxPages = Math.ceil(maxItems / limit);
  let complete = true;

  // Get the API URL, defaulting to a sensible value if not defined
  const mixcloudApi =
    process.env.MIXCLOUD_API || "https://api.mixcloud.com/thfradio/cloudcasts/";

  // Fetch in batches with improved error handling
  const results: CloudShowTypes[][] = [];

  for (let i = 0; i < maxPages; i++) {
    try {
      const response = await fetch(
        `${mixcloudApi}?offset=${i * limit}&limit=${limit}`,
      );

      // No such account (Mixcloud given up): simply no Mixcloud shows,
      // not a hiccup that keeps the old list
      if (response.status === 404) break;

      if (!response.ok) {
        console.error(
          `Mixcloud API error on page ${i + 1}: ${response.status} ${response.statusText}`,
        );
        complete = false;
        continue; // Skip this batch but continue with others
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        console.error(`Unexpected Mixcloud API response on page ${i + 1}`);
        complete = false;
        continue;
      }

      const normalizedShows = data.data.map(normalizeMixcloudShow);
      results.push(normalizedShows);

      // Stop if we've reached the end of the data
      if (data.data.length < limit) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching Mixcloud batch ${i + 1}:`, error);
      complete = false;
      // Continue with next batch despite errors
    }
  }

  // Combine all successful results
  return { shows: results.flat(), complete };
}
