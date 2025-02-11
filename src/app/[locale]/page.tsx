import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import HomeContent from './page.client';
import { fetchHomePage } from '@/lib/pages';
import { fetchNews } from '@/lib/news';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchHomePage(locale);

  if (!page) {
    return createMetadata({
      title: 'THF Radio',
      description: 'Community radio based in Berlin',
    });
  }

  return createMetadata({
    title: page.attributes.page.title,
    description: page.attributes.page.description,
  });
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchHomePage(locale);
  const latestNews = await fetchNews(locale);

  if (!page) {
    return <div>Failed to load page content. Please try again later.</div>;
  }

  return <HomeContent page={page} latestNews={latestNews} />;
}
