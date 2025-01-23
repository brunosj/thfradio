import { Metadata } from 'next';
import Image from 'next/image';
import ShowDetails from '@/modules/show-listing/ProgrammeShowDetails';
import CloudShowChild from '@/modules/archive/CloudShowChild';
import { createMetadata } from '@/utils/metadata';
import { CMS_URL } from '@/utils/constants';
import type { ShowTypes } from '@/types/ResponsesInterface';
async function getShowData(slug: string) {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=all&populate=*`,
    { next: { revalidate: 10 } }
  );
  const initial = await res.json();
  const currentLocaleEntry = initial.data.find(
    (entry: ShowTypes) =>
      entry.attributes.slug === slug && entry.attributes.locale === 'en'
  );
  return currentLocaleEntry;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const content = await getShowData(params.slug);
  const image =
    content.attributes.pictureFullWidth?.data?.attributes.url ||
    content.attributes.picture?.data?.attributes.url ||
    '';

  return generateMetadata({
    title: content.attributes.title,
    description: content.attributes.description,
    image: `${CMS_URL}${image}`,
  });
}

export default async function ShowPage({
  params,
}: {
  params: { slug: string };
}) {
  const content = await getShowData(params.slug);

  const image =
    content.attributes.pictureFullWidth?.data?.attributes.url ||
    content.attributes.picture?.data?.attributes.url ||
    '';

  return (
    <div className='relative'>
      {content.attributes.pictureFullWidth?.data ? (
        <div className='relative min-h-fit lg:min-h-[80vh] w-full'>
          <Image
            quality={50}
            src={`${CMS_URL}${content.attributes.pictureFullWidth?.data.attributes.url}`}
            fill
            sizes=''
            className='object-cover object-center'
            alt={content.attributes.title}
          />
          <div className='layout overflow-hidden pt-12 pb-6'>
            <ShowDetails currentContent={content} />
          </div>
        </div>
      ) : (
        <div className='layout relative min-h-fit lg:min-h-[60vh] w-full bg-orange-500 pt-12 pb-6'>
          <ShowDetails currentContent={content} />
        </div>
      )}

      <div className='bg-dark-blue min-h-[30vh] lg:min-h-[40vh] layout lg:pt-60 pt-12 pb-6 lg:pb-12'>
        {/* Cloud shows will need to be handled through a client component */}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}shows?locale=all&populate=localizations`
  );
  const items = await res.json();

  return items.data.map((item: ShowTypes) => ({
    slug: item.attributes.slug,
  }));
}
