import type { CloudShowTypes } from '@/types/ResponsesInterface';

interface MixcloudResponse {
  data: CloudShowTypes[];
}

export async function GET() {
  const limit = 100;
  const totalItems = 1500;
  const pages = Math.ceil(totalItems / limit);
  const promises = [];

  try {
    for (let i = 0; i < pages; i++) {
      const promise = fetch(
        `${process.env.MIXCLOUD_API}?offset=${i * limit}&limit=${limit}`
      )
        .then((res) => res.json())
        .then((data: any) => data as MixcloudResponse)
        .then((data: MixcloudResponse) => data.data);

      promises.push(promise);
    }

    const results = await Promise.all(promises);
    const shows = results.flat().slice(0, totalItems);
    return Response.json(shows);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch shows' }, { status: 500 });
  }
}
