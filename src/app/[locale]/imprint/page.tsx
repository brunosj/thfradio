import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';

async function getImprintPageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const pages = await pagesResponse.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === 'imprint'
  );
  return page;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getImprintPageData();
  return generateMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ImprintPage() {
  const page = await getImprintPageData();

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
          <div className='text-white mt-4'>{page.attributes.description}</div>
        </div>
      </div>
      <div className='layout py-8 lg:py-16'>
        <div
          className='prose prose-lg'
          dangerouslySetInnerHTML={{ __html: page.attributes.content }}
        />
      </div>
    </>
  );
}
