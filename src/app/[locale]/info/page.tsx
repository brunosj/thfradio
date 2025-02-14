import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import InfoContent from './page.client';
import { fetchAboutPage } from '@/lib/pages';
import { notFound } from 'next/navigation';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchAboutPage(locale);
  return createMetadata({
    title: page?.attributes.page.title,
    description: page?.attributes.page.description,
  });
}

export default async function InfoPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchAboutPage(locale);

  if (!page) {
    notFound();
  }

  return <InfoContent page={page} />;
}
