import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import ArchiveShows from '@/modules/archive/ArchiveShows';

async function getArchivePageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const pages = await pagesResponse.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === 'archive'
  );
  return page;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getArchivePageData();
  return generateMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ArchivePage() {
  const page = await getArchivePageData();

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
          <p className='text-white mt-4'>{page.attributes.description}</p>
        </div>
      </div>
      <ArchiveShows />
    </>
  );
}
