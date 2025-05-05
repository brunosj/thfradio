'use client';

import { useState, useEffect } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import BarsSpinner from '@/common/ui/BarsSpinner';
import UIButton from '@/common/ui/UIButton';
import { processShows } from '@/utils/showUtils';
import CloudShowsComponent from './CloudShowsComponent';
import { useData } from '@/context/DataContext';
import { useTranslations } from 'next-intl';

interface ArchiveProps {
  title: string;
  text: string;
  showAll?: boolean;
  backgroundColor?: string;
}

const HomeArchiveSection = ({
  title,
  text,
  showAll = false,
  backgroundColor = 'bg-thf-blue-500',
}: ArchiveProps) => {
  const t = useTranslations();
  const {
    cloudShows,
    isLoadingShows,
    hasError,
    tagsList,
    loadCloudShows,
    retryLoadingShows,
  } = useData();
  const [isVisible, setIsVisible] = useState(showAll); // Initialize to true when showAll is true
  const [loadAttempts, setLoadAttempts] = useState(0);
  const MAX_LOAD_ATTEMPTS = 2;

  useEffect(() => {
    // If showAll is true, load data immediately without waiting for intersection
    if (showAll) {
      setIsVisible(true);
      loadCloudShows();
      return;
    }

    // Only use Intersection Observer if we're on the homepage (not showAll)
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

    const element = document.getElementById('programme');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [loadCloudShows, showAll]);

  // Handle auto-retry
  useEffect(() => {
    if (hasError && loadAttempts < MAX_LOAD_ATTEMPTS) {
      const timer = setTimeout(() => {
        setLoadAttempts((prev) => prev + 1);
        retryLoadingShows();
      }, 2000); // Wait 2 seconds before retrying

      return () => clearTimeout(timer);
    }
  }, [hasError, loadAttempts, retryLoadingShows]);

  // Get all shows and sort them
  const allSortedShows = cloudShows ? processShows(cloudShows) : [];

  // If not showing all, limit to only 8 latest shows
  const sortedShows = showAll ? allSortedShows : allSortedShows.slice(0, 8);

  const handleRetry = () => {
    setLoadAttempts(0);
    retryLoadingShows();
  };

  return (
    <section
      className={`${backgroundColor} scroll-mt-24 sectionPb min-h-[60lvh]`}
      id='latest'
    >
      <SectionHeader title={title} text={text} />
      <div className='flex w-full m-auto flex-col'>
        {hasError && loadAttempts >= MAX_LOAD_ATTEMPTS ? (
          <div className='m-auto text-center pb-12'>
            <p className='text-red-500 mb-4'>{t('failedToLoadShows')}</p>
            <UIButton
              onClick={handleRetry}
              color='white-orange'
              className='inline-block'
              ariaLabel='Retry loading shows'
              path='#'
            >
              {t('retry')}
            </UIButton>
          </div>
        ) : !isVisible || isLoadingShows || !cloudShows ? (
          <div className='m-auto text-center pb-12'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : (
          <>
            <CloudShowsComponent items={sortedShows} tagsList={tagsList} />

            {!showAll && sortedShows.length > 0 && (
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
