import { Metadata } from 'next';
import { Suspense } from 'react';
import ProgrammeShows from '@/modules/show-listing/ProgrammeShows';
import { createMetadata } from '@/utils/metadata';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { fetchPageBySlug } from '@/lib/pages';
import { fetchProgrammeShows } from '@/lib/shows';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug('shows', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ShowsPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug('shows', locale);
  const shows = await fetchProgrammeShows(locale);

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
        </div>
      </div>
      <Suspense
        fallback={
          <div className='min-h-[60vh] flex items-center justify-center'>
            <BarsSpinner color='#ff6314' />
          </div>
        }
      >
        <ProgrammeShows shows={shows} />
      </Suspense>
    </>
  );
}
