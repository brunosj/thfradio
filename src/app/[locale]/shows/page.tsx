import { Metadata } from 'next';
import ShowsDirectory from '@/modules/show-listing/ShowsDirectory';
import { createMetadata } from '@/utils/metadata';
import { fetchPageBySlug } from '@/lib/pages';
import { metadataFromPage } from '@/lib/metadataPlainText';
import { fetchProgrammeShows } from '@/lib/shows';
import { notFound } from 'next/navigation';
import type { ShowTypes } from '@/types/ResponsesInterface';

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

  // Residents / Guests tabs replace the CMS page heading.
  // Only thfradio.space marks which shows still run (the old backend marks all as active).
  return <ShowsDirectory shows={shows} activeFlagReliable={process.env.SHOWS_SOURCE === 'intranet'} />;
}
