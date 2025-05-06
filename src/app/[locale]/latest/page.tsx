import React from 'react';
import LatestArchiveSection from '@/modules/archive/LatestArchiveSection';
import { PageTypes } from '@/app/_types/ResponsesInterface';
import { Metadata } from 'next';
import { fetchPageBySlug } from '@/lib/pages';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('latest', locale);
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}
export default async function LatestPage({ params }: { params: Params }) {
  const { locale } = await params;
  const page: PageTypes = await fetchPageBySlug('latest', locale);

  if (!page) {
    notFound();
  }

  return (
    <main className='min-h-[80lvh]'>
      <div className='bg-thf-blue-500 relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white text-center'>{page.attributes.title}</h1>
        </div>
      </div>
      <LatestArchiveSection
        title=''
        text={page.attributes.description}
        backgroundColor='bg-dark-blue'
      />
    </main>
  );
}
