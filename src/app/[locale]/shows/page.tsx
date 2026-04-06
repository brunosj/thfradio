import { Metadata } from 'next';
import ProgrammeShows from '@/modules/show-listing/ProgrammeShows';
import { createMetadata } from '@/utils/metadata';
import { fetchPageBySlug } from '@/lib/pages';
import { metadataFromPage } from '@/lib/metadataPlainText';
import { fetchProgrammeShows } from '@/lib/shows';
import { notFound } from 'next/navigation';
import type { ShowTypes } from '@/types/ResponsesInterface';
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
  const page = await fetchPageBySlug('shows', locale);
  return createMetadata(metadataFromPage(page));
}

export default async function ShowsPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug('shows', locale);
  const shows: ShowTypes[] = await fetchProgrammeShows(locale);

  if (!page) {
    notFound();
  }

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <SectionHeader title={page.title ?? ''} text={page.description ?? ''} />
      </div>

      <ProgrammeShows shows={shows} />
    </>
  );
}
