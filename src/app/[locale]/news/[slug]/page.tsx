import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import { CMS_URL } from '@/utils/constants';
import { setRequestLocale } from 'next-intl/server';
import type { NewsType } from '@/types/ResponsesInterface';
import NewsContent from './page.client';

async function getNewsArticle(slug: string, locale: string) {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const initial = await res.json();
  return initial.data[0];
}

type Params = Promise<{ slug: string; locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getNewsArticle(slug, locale);
  const image = article.attributes.picture?.data?.attributes.url || '';

  return createMetadata({
    title: article.attributes.title,
    description: article.attributes.description,
    image: `${CMS_URL}${image}`,
  });
}

export default async function NewsArticlePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await getNewsArticle(slug, locale);

  if (!article) {
    return <div>Failed to load article. Please try again later.</div>;
  }

  return <NewsContent article={article} />;
}

export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}news?locale=all&populate=localizations`
    );

    if (!res.ok) {
      console.error('Failed to fetch news data for static params');
      return [];
    }

    const items = await res.json();

    if (!items?.data) {
      console.error('No data in news response for static params');
      return [];
    }

    return (
      items.data.map((item: NewsType) => ({
        slug: item.attributes.slug,
        locale: item.attributes.locale,
      })) || []
    );
  } catch (error) {
    console.error('Error generating static params for news:', error);
    return [];
  }
}
