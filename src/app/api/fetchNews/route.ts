import { type NextRequest } from 'next/server';
import type { NewsType } from '@/types/ResponsesInterface';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'en';

  try {
    const response = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}news-items?locale=${locale}&populate=*`
    );
    const data = (await response.json()) as NewsType[];
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
