import type { HomepageTypes } from '@/types/ResponsesInterface';
import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import HomeContent from './page.client';
import { setRequestLocale } from 'next-intl/server';

type Params = Promise<{ locale: string }>;

async function getHomePageData(locale: string): Promise<HomepageTypes | null> {
  try {
    const pagesResponse = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}homepage?locale=${locale}&populate=*`,
      { next: { revalidate: 10 } }
    );

    if (!pagesResponse.ok) {
      throw new Error(
        `Failed to fetch homepage data: ${pagesResponse.statusText}`
      );
    }

    const page = await pagesResponse.json();

    if (!page?.data) {
      throw new Error('No data received from the API');
    }

    return page.data;
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getHomePageData(locale);

  if (!page) {
    return createMetadata({
      title: 'Error',
      description: 'Failed to load page content',
    });
  }

  return createMetadata({
    title: page.attributes.page.title,
    description: page.attributes.page.description,
  });
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = await getHomePageData(locale);

  if (!page) {
    return <div>Failed to load page content. Please try again later.</div>;
  }

  return <HomeContent page={page} />;
}
