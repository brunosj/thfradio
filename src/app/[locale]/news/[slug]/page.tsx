import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import { CMS_URL } from '@/utils/constants';
// import type { NewsType, LocalizationType } from '@/types/ResponsesInterface';
import NewsContent from './page.client';
import { fetchNewsArticle } from '@/lib/news';

type Params = Promise<{ slug: string; locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await fetchNewsArticle(slug, locale);
  const image = article.attributes.picture?.data?.attributes.url || '';

  return createMetadata({
    title: article.attributes.title,
    description: article.attributes.summary,
    image: `${CMS_URL}${image}`,
  });
}

export default async function NewsArticlePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const article = await fetchNewsArticle(slug, locale);

  if (!article) {
    return <div>Failed to load article. Please try again later.</div>;
  }

  return <NewsContent article={article} />;
}

// export async function generateStaticParams() {
//   try {
//     const res = await fetch(
//       `${process.env.STRAPI_PUBLIC_API_URL}news?locale=all&populate=localizations`
//     );

//     if (!res.ok) {
//       console.error('Failed to fetch news data for static params');
//       return [];
//     }

//     const items = await res.json();

//     if (!items?.data) {
//       console.error('No data in news response for static params');
//       return [];
//     }

//     const params = items.data.flatMap((item: NewsType) => {
//       const localizations = item.attributes.localizations?.data || [];
//       return [
//         {
//           slug: item.attributes.slug,
//           locale: item.attributes.locale,
//         },
//         ...localizations.map((l: LocalizationType) => ({
//           slug: l.attributes.slug,
//           locale: l.attributes.locale,
//         })),
//       ];
//     });

//     return params;
//   } catch (error) {
//     console.error('Error generating static params for news:', error);
//     return [];
//   }
// }
