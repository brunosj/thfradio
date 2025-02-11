import type { CloudShowTypes, ShowTypes } from '@/types/ResponsesInterface';

type ShowsType = {
  data: ShowTypes[];
};

export async function fetchCloudShows(): Promise<CloudShowTypes[]> {
  const limit = 100;
  const totalItems = 1500;
  const pages = Math.ceil(totalItems / limit);
  const promises = [];

  for (let i = 0; i < pages; i++) {
    const promise = fetch(
      `${process.env.MIXCLOUD_API}?offset=${i * limit}&limit=${limit}`
    )
      .then((res) => res.json())
      .then((data) => data.data);
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  return results.flat().slice(0, totalItems);
}

export async function fetchProgrammeShows(locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&populate=*`
  );
  const data: ShowsType = await response.json();
  return data.data;
}

export async function fetchShowBySlug(slug: string, locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`
  );
  const data: ShowsType = await response.json();
  return data.data[0];
}
