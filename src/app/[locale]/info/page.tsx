import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import InfoContent from './page.client';
import type { AboutTypes } from '@/types/ResponsesInterface';

async function getInfoPageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}about?locale=${locale}&populate[page][populate]=*&populate[radioSection][populate]=*&populate[torhausSection][populate]=*&populate[heroPictures][populate]=*&populate[imageBanner][populate]=*&populate[codeOfConduct][populate]=*`,
    { next: { revalidate: 10 } }
  );
  const page = await pagesResponse.json();
  return page.data;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getInfoPageData();
  return createMetadata({
    title: page.attributes.page.title,
    description: page.attributes.page.description,
  });
}

export default async function InfoPage() {
  const page = await getInfoPageData();
  return <InfoContent page={page} />;
}
