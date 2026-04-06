'use client';

import Image from 'next/image';
import { CMS_URL } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useState, useEffect } from 'react';
import type { NewsType } from '@/types/ResponsesInterface';
import { sanitizeCmsHtml } from '@/lib/sanitizeHtml';

function resolveNewsImageSrc(image: string | undefined): string | null {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  const base = CMS_URL ?? '';
  return image.startsWith('/') ? `${base}${image}` : `${base}/${image}`;
}

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

  const imageSrc = resolveNewsImageSrc(article.image);

  return (
    <article className='min-h-screen'>
      {imageSrc ? (
        <div className='relative h-[50vh] w-full'>
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            className='object-cover'
          />
        </div>
      ) : null}
      <div className='layout py-8 lg:py-16'>
        <h1>{article.title}</h1>
        <time className='text-sm text-gray-500 block mt-2'>
          {formatDate(article.date)}
        </time>
        <div
          className='prose prose-lg mt-8'
          dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(article.text) }}
        />
      </div>
    </article>
  );
}
