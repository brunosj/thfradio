import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import NewsContent from './page.client';
import { fetchPageBySlug } from '@/lib/pages';
import { fetchNews } from '@/lib/news';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug('news', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function NewsPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug('news', locale);
  const newsItems = await fetchNews(locale);

  return <NewsContent page={page} newsItems={newsItems} />;
}
