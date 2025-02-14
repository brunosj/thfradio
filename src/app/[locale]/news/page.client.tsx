'use client';

import NewsChild from '@/modules/news/NewsChild';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useState, useEffect } from 'react';
import type { NewsType, PageTypes } from '@/types/ResponsesInterface';

export default function NewsContent({
  page,
  newsItems,
}: {
  page: PageTypes;
  newsItems: NewsType[];
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (newsItems && newsItems.length > 0) {
      setIsLoading(false);
      setError(null);
    } else {
      setError('Failed to load news. Please try again later.');
    }
  }, [newsItems]);

  if (error) {
    return (
      <div className='bg-thf-blue-500'>
        <div className='layout py-12 text-center text-white'>{error}</div>
      </div>
    );
  }

  return (
    <div className='bg-thf-blue-500 relative pt-6 lg:pt-10'>
      <div className='layout sectionPy'>
        <h1 className='text-white'>{page.attributes.title}</h1>
      </div>
      {isLoading ? (
        <div className='min-h-[80vh] flex items-center justify-center bg-dark-blue'>
          <BarsSpinner color='#ff6314' />
        </div>
      ) : (
        <div className='bg-dark-blue layout grid grid-cols-1 lg:grid-cols-2 sectionPy gap-6 lg:gap-12'>
          {newsItems
            .sort(
              (a: NewsType, b: NewsType) =>
                new Date(b.attributes.date).getTime() -
                new Date(a.attributes.date).getTime()
            )
            .map((item: NewsType, i: number) => (
              <NewsChild key={i} item={item} />
            ))}
        </div>
      )}
    </div>
  );
}
