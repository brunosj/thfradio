import { Metadata } from 'next';
import Image from 'next/image';
import { createMetadata } from '@/utils/metadata';
import { CMS_URL } from '@/utils/constants';

async function getAboutPageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const pages = await pagesResponse.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === 'about'
  );
  return page;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPageData();
  return generateMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function AboutPage() {
  const page = await getAboutPageData();

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
          <div className='text-white mt-4'>{page.attributes.description}</div>
        </div>
      </div>
      {page.attributes.picture?.data && (
        <div className='relative h-[50vh] w-full'>
          <Image
            src={`${CMS_URL}${page.attributes.picture.data.attributes.url}`}
            alt={page.attributes.title}
            fill
            className='object-cover'
          />
        </div>
      )}
      <div className='layout py-8 lg:py-16'>
        <div
          className='prose prose-lg'
          dangerouslySetInnerHTML={{ __html: page.attributes.content }}
        />
      </div>
    </>
  );
}
