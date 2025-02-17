import { Metadata } from 'next';
import ProgrammeShows from '@/modules/show-listing/ProgrammeShows';
import { createMetadata } from '@/utils/metadata';
import { fetchPageBySlug } from '@/lib/pages';
import { fetchProgrammeShows } from '@/lib/shows';
import { notFound } from 'next/navigation';
import type { PageTypes, ShowTypes } from '@/types/ResponsesInterface';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('shows', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ShowsPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('shows', locale);
  const shows: ShowTypes[] = await fetchProgrammeShows(locale);

  if (!page) {
    notFound();
  }

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
        </div>
      </div>

      <ProgrammeShows shows={shows} />
    </>
  );
}
