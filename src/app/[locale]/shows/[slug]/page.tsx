import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import ShowContent from './page.client';
import { setRequestLocale } from 'next-intl/server';
// import type { ShowTypes } from '@/types/ResponsesInterface';
import { CMS_URL } from '@/utils/constants';

async function getShowData(slug: string, locale: string) {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`,
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
  const content = await getShowData(slug, locale);
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
//   const res = await fetch(
//     `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=all&populate=localizations`
//   );
//   const items = await res.json();

//   return items.data.map((item: ShowTypes) => ({
//     slug: item.attributes.slug,
//     locale: item.attributes.locale,
//   }));
// }

export default async function ShowPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const content = await getShowData(slug, locale);

  if (!content) {
    return <div>Failed to load show content. Please try again later.</div>;
  }

  return <ShowContent content={content} />;
}
