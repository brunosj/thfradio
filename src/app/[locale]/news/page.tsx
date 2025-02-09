import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import NewsContent from './page.client';
import type { PageTypes } from '@/types/ResponsesInterface';
import { setRequestLocale } from 'next-intl/server';

type Params = Promise<{ locale: string }>;

async function getNewsPageData(locale: string) {
  try {
    const pagesResponse = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
      { next: { revalidate: 10 } }
    );

    if (!pagesResponse.ok) {
      throw new Error(`Failed to fetch news data: ${pagesResponse.statusText}`);
    }

    const pages = await pagesResponse.json();
    const [page] = pages.data.filter(
      (page: PageTypes) => page.attributes.slug === 'news'
    );

    if (!page) {
      throw new Error('News page not found');
    }

    return page;
  } catch (error) {
    console.error('Error fetching news data:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getNewsPageData(locale);

  if (!page) {
    return createMetadata({
      title: 'Error',
      description: 'Failed to load news content',
    });
  }

  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function NewsPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = await getNewsPageData(locale);

  if (!page) {
    return <div>Failed to load news content. Please try again later.</div>;
  }

  return <NewsContent page={page} />;
}
