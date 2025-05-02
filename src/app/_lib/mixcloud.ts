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
  const limit = 100;
  const totalItems = 3000;
  const pages = Math.ceil(totalItems / limit);
  const promises = [];

  for (let i = 0; i < pages; i++) {
    const promise = fetch(
      `${process.env.MIXCLOUD_API}?offset=${i * limit}&limit=${limit}`
    )
      .then((res) => res.json())
      .then((data) => data.data.map(normalizeMixcloudShow));
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  return results.flat().slice(0, totalItems);
}
