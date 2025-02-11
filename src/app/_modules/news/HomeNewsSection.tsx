'use client';

import { useEffect, useState } from 'react';
import type { NewsType } from '@/types/ResponsesInterface';
import SectionHeader from '@/common/layout/section/SectionHeader';
import Button from '@/common/ui/UIButton';
import NewsCarousel from '../carousel/NewsCarousel';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useTranslations } from 'next-intl';

interface NewsProps {
  title: string;
  text: string;
  newsItems: NewsType[];
}

export default function HomeNewsSection({ title, text, newsItems }: NewsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    if (newsItems && newsItems.length > 0) {
      setIsLoading(false);
    }
  }, [newsItems]);

  return (
    <section className='bg-dark-blue sectionPb'>
      <SectionHeader title={title} text={text} />
      <div className='layout'>
        {isLoading ? (
          <div className='flex justify-center pb-12'>
            <BarsSpinner color='#1200ff' />
          </div>
        ) : (
          <NewsCarousel slides={newsItems} />
        )}
      </div>
      <div className='pt-12 flex justify-center'>
        <Button
          path='/news'
          color='white-blue'
          ariaLabel={t('navigation.toNews')}
        >
          {t('allNews')}
        </Button>
      </div>
    </section>
  );
}
