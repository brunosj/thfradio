'use client';

import { useData } from '@/app/_context/DataContext';
import NewsChild from '@/modules/news/NewsChild';
import type { NewsType, PageTypes } from '@/types/ResponsesInterface';

export default function NewsContent({ page }: { page: PageTypes }) {
  const { news } = useData();

  return (
    <div className='bg-thf-blue-500 relative pt-6 lg:pt-10'>
      <div className='layout sectionPy'>
        <h1 className='text-white'>{page.attributes.title}</h1>
      </div>
      <div className='bg-dark-blue layout grid grid-cols-1 lg:grid-cols-2 sectionPy gap-6 lg:gap-12'>
        {news
          .sort(
            (a: NewsType, b: NewsType) =>
              new Date(b.attributes.date).getTime() -
              new Date(a.attributes.date).getTime()
          )
          .map((item: NewsType, i: number) => (
            <NewsChild key={i} item={item} />
          ))}
      </div>
    </div>
  );
}
