import React from 'react';
import LatestArchiveSection from '@/modules/archive/LatestArchiveSection';
import { Metadata } from 'next';
import { fetchPageBySlug } from '@/lib/pages';
import { createMetadata } from '@/utils/metadata';
import { metadataFromPage } from '@/lib/metadataPlainText';
import { notFound } from 'next/navigation';
import SanitizedHtml from '@/common/ui/SanitizedHtml';
import SectionHeader from '@/common/layout/section/SectionHeader';

type Params = Promise<{ locale: string }>;

// Revalidate this page every 12 hours (same as API cache)
export const revalidate = 43200;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug('latest', locale);
  return createMetadata(metadataFromPage(page));
}
export default async function LatestPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug('latest', locale);

  if (!page) {
    notFound();
  }

  const introHtml = page.content?.trim();

  return (
    <main className='min-h-[80lvh] pt-10 bg-dark-blue'>
      <LatestArchiveSection
        title={page.title ?? ''}
        text={page.description ?? ''}
        backgroundColor='bg-dark-blue'
      />
    </main>
  );
}
