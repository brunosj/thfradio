'use client';

import Image from 'next/image';
import { CMS_URL } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useState, useEffect } from 'react';
import type { NewsType } from '@/types/ResponsesInterface';

export default function NewsContent({ article }: { article: NewsType }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (article) {
      setIsLoading(false);
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <BarsSpinner color='#ff6314' />
      </div>
    );
  }

  return (
    <article className='min-h-screen'>
      {article.attributes.picture?.data && (
        <div className='relative h-[50vh] w-full'>
          <Image
            src={`${CMS_URL}${article.attributes.picture.data.attributes.url}`}
            alt={article.attributes.title}
            fill
            className='object-cover'
          />
        </div>
      )}
      <div className='layout py-8 lg:py-16'>
        <h1>{article.attributes.title}</h1>
        <time className='text-sm text-gray-500 block mt-2'>
          {formatDate(article.attributes.date)}
        </time>
        <div
          className='prose prose-lg mt-8'
          dangerouslySetInnerHTML={{ __html: article.attributes.text }}
        />
      </div>
    </article>
  );
}
