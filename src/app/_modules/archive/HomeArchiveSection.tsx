'use client';

import { useEffect, useState } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import BarsSpinner from '@/common/ui/BarsSpinner';
import UIButton from '@/common/ui/UIButton';
import { processShows } from '@/utils/showUtils';
import CloudShowsComponent from './CloudShowsComponent';
import { useData } from '@/context/DataContext';
import { useTranslations } from 'next-intl';

interface HomeArchiveSectionProps {
  title: string;
  text: string;
  backgroundColor?: string;
}

const HomeArchiveSection = ({
  title,
  text,
  backgroundColor = 'bg-thf-blue-500',
}: HomeArchiveSectionProps) => {
  const t = useTranslations();
  const { cloudShows, isLoadingShows, tagsList, loadCloudShows, showsError } =
    useData();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Use Intersection Observer to load shows when section comes into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          loadCloudShows();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('latest');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [loadCloudShows]);

  // Get only the 8 latest shows
  const latestShows = cloudShows ? processShows(cloudShows).slice(0, 8) : [];

  return (
    <section
      className={`${backgroundColor} scroll-mt-24 sectionPb min-h-[60lvh]`}
      id='latest'
    >
      <SectionHeader title={title} text={text} />
      <div className='flex w-full m-auto flex-col'>
        {!isVisible || isLoadingShows || !cloudShows ? (
          <div className='m-auto text-center pb-12'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : showsError ? (
          <div className='m-auto text-center pb-12 text-red-500'>
            <p>Error loading shows. Please try again later.</p>
          </div>
        ) : (
          <>
            <CloudShowsComponent items={latestShows} tagsList={tagsList} />

            {latestShows.length > 0 && (
              <div className='layout text-center pt-12'>
                <UIButton
                  path='/latest'
                  color='white-orange'
                  className='inline-block'
                  ariaLabel='View all shows'
                >
                  {t('viewAllShows')}
                </UIButton>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default HomeArchiveSection;
