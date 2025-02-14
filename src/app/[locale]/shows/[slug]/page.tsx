import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import ShowContent from './page.client';
// import type { LocalizationType, ShowTypes } from '@/types/ResponsesInterface';
import { CMS_URL } from '@/utils/constants';
import { fetchShowBySlug } from '@/lib/shows';
import { notFound } from 'next/navigation';

type Params = Promise<{ slug: string; locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const content = await fetchShowBySlug(slug, locale);
  const image =
    content.attributes.pictureFullWidth?.data?.attributes.url ||
    content.attributes.picture?.data?.attributes.url ||
    '';

  return createMetadata({
    title: content.attributes.title,
    description: content.attributes.description,
    image: `${CMS_URL}${image}`,
  });
}

// export async function generateStaticParams() {
//   try {
//     const res = await fetch(
//       `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=all&populate=localizations`
//     );

//     if (!res.ok) {
//       console.error('Failed to fetch shows data for static params');
//       return [];
//     }

//     const items = await res.json();

//     if (!items?.data) {
//       console.error('No data in shows response for static params');
//       return [];
//     }

//     // Generate params for all locales and slugs
//     const params = items.data.flatMap((item: ShowTypes) => {
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
//     console.error('Error generating static params for shows:', error);
//     return [];
//   }
// }

export default async function ShowPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const content = await fetchShowBySlug(slug, locale);

  if (!content) {
    notFound();
  }

  return <ShowContent content={content} />;
}
