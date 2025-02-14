import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import { fetchPageBySlug } from '@/lib/pages';
import { notFound } from 'next/navigation';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await fetchPageBySlug('privacy', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function PrivacyPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page = await fetchPageBySlug('privacy', locale);

  if (!page) {
    notFound();
  }

  return (
    <div className='bg-dark-blue'>
      <div className='layout sectionPy'>
        <h1 className='text-white'>{page.attributes.title}</h1>
        <div
          className='prose prose-lg mt-8 text-white'
          dangerouslySetInnerHTML={{ __html: page.attributes.content }}
        />
      </div>
    </div>
  );
}
