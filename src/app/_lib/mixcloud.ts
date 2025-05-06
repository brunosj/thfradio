import type {
  CloudShowTypes,
  MixcloudShowType,
  CloudShowTag,
} from '@/types/ResponsesInterface';

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
        url: `tag/${tag.key.toLowerCase().replace(/\s+/g, '-')}`,
      };
    });
  }

  return {
    name: show.name,
    url: show.url,
    key: show.key,
    platform: 'mixcloud',
    pictures: show.pictures,
    tags: formattedTags,
  };
}

export async function fetchMixcloudShows(): Promise<CloudShowTypes[]> {
  // More reasonable limits to avoid overwhelming the API
  const limit = 100;
  const maxItems = 1000; // Reduced from 3000 to be more reasonable
  const maxPages = Math.ceil(maxItems / limit);

  // Get the API URL, defaulting to a sensible value if not defined
  const mixcloudApi =
    process.env.MIXCLOUD_API || 'https://api.mixcloud.com/thfradio/cloudcasts/';
  console.log(`Fetching Mixcloud shows from: ${mixcloudApi}`);

  // Fetch in batches with improved error handling
  const results: CloudShowTypes[][] = [];

  for (let i = 0; i < maxPages; i++) {
    try {
      console.log(
        `Fetching Mixcloud batch ${i + 1}/${maxPages}: offset=${i * limit}, limit=${limit}`
      );
      const response = await fetch(
        `${mixcloudApi}?offset=${i * limit}&limit=${limit}`
      );

      if (!response.ok) {
        console.error(
          `Mixcloud API error on page ${i + 1}: ${response.status} ${response.statusText}`
        );
        continue; // Skip this batch but continue with others
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        console.error(
          `Unexpected Mixcloud API response on page ${i + 1}:`,
          data
        );
        continue;
      }

      const normalizedShows = data.data.map(normalizeMixcloudShow);
      results.push(normalizedShows);

      console.log(
        `Successfully fetched ${normalizedShows.length} shows from batch ${i + 1}`
      );

      // Stop if we've reached the end of the data
      if (data.data.length < limit) {
        console.log(`Reached end of available data at batch ${i + 1}`);
        break;
      }
    } catch (error) {
      console.error(`Error fetching Mixcloud batch ${i + 1}:`, error);
      // Continue with next batch despite errors
    }
  }

  // Combine all successful results
  const allShows = results.flat();
  console.log(`Total Mixcloud shows fetched: ${allShows.length}`);
  return allShows.slice(0, maxItems);
}
