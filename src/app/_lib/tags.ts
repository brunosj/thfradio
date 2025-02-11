import type { TagsList } from '@/types/ResponsesInterface';

export async function fetchTags(): Promise<TagsList> {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}tag-list?populate[tag][populate]=*`
  );
  const data = await response.json();
  return data.data;
}
