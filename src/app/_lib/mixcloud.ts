import type {
  CloudShowTypes,
  MixcloudShowType,
} from '@/types/ResponsesInterface';

function normalizeMixcloudShow(show: MixcloudShowType): CloudShowTypes {
  return {
    ...show,
    platform: 'mixcloud',
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
