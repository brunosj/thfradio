import { Metadata } from 'next';
import ProgrammeShows from '@/modules/show-listing/ProgrammeShows';
import { createMetadata } from '@/utils/metadata';
import type { PageTypes } from '@/types/ResponsesInterface';

async function getShowsPageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const pages = await pagesResponse.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === 'shows'
  );
  return page;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getShowsPageData();
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ShowsPage() {
  const page = await getShowsPageData();

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
        </div>
      </div>
      <ProgrammeShows items={page.attributes.programmeShows} />
    </>
  );
}
