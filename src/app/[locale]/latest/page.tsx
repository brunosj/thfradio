import { Metadata } from 'next';
import ShowsDirectory from '@/modules/show-listing/ShowsDirectory';
import { createMetadata } from '@/utils/metadata';
import { fetchPageBySlug } from '@/lib/pages';
import { metadataFromPage } from '@/lib/metadataPlainText';
import { fetchProgrammeShows } from '@/lib/shows';
import type { ShowTypes } from '@/types/ResponsesInterface';

type Params = Promise<{ locale: string }>;

// Archiv (menu "Archiv"): every episode, filter by show and genre.
// The show list only feeds the show filter, so it can be cached for long.
export const revalidate = 43200;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug('latest', locale).catch(() => null);
  return createMetadata(
    page
      ? metadataFromPage(page)
      : { title: locale === 'de' ? 'Archiv' : 'Archive' },
  );
}

export default async function LatestPage({ params }: { params: Params }) {
  const { locale } = await params;
  const shows: ShowTypes[] = await fetchProgrammeShows(locale);
  return (
    <ShowsDirectory
      shows={shows}
      mode='archive'
      activeFlagReliable={process.env.SHOWS_SOURCE === 'intranet'}
    />
  );
}
