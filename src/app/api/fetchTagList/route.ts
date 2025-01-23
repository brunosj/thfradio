import type { TagsList } from '@/types/ResponsesInterface';

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}tag-list?populate[tag][populate]=*`
    );
    const data = (await response.json()) as TagsList;
    return Response.json(data.data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
