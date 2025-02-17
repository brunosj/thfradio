import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import NewsContent from './page.client';
import { fetchPageBySlug } from '@/lib/pages';
import { fetchNews } from '@/lib/news';
import { notFound } from 'next/navigation';
import type { PageTypes } from '@/types/ResponsesInterface';
type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('news', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function NewsPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('news', locale);

  if (!page) {
    notFound();
  }

  const newsItems = await fetchNews(locale);

  return <NewsContent page={page} newsItems={newsItems} />;
}
