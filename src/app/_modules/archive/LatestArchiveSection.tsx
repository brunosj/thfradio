'use client';

import { useEffect } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { processShows } from '@/utils/showUtils';
import CloudShowsComponent from './CloudShowsComponent';
import { useData } from '@/context/DataContext';

interface LatestArchiveSectionProps {
  title: string;
  text: string;
  backgroundColor?: string;
}

const LatestArchiveSection = ({
  title,
  text,
  backgroundColor = 'bg-dark-blue',
}: LatestArchiveSectionProps) => {
  const { cloudShows, isLoadingShows, tagsList, loadCloudShows, showsError } =
    useData();

  // Load data immediately on mount
  useEffect(() => {
    loadCloudShows();
  }, [loadCloudShows]);

  // Get all shows and sort them
  const allSortedShows = cloudShows ? processShows(cloudShows) : [];

  return (
    <section
      className={`${backgroundColor} scroll-mt-24 sectionPb min-h-[60lvh]`}
      id='latest'
    >
      <SectionHeader title={title} text={text} />
      <div className='flex w-full m-auto flex-col'>
        {isLoadingShows || !cloudShows ? (
          <div className='m-auto text-center pb-12'>
            <BarsSpinner color='#ff6314' />
          </div>
        ) : showsError ? (
          <div className='m-auto text-center pb-12 text-red-500'>
            <p>Error loading shows. Please try again later.</p>
          </div>
        ) : (
          <CloudShowsComponent items={allSortedShows} tagsList={tagsList} />
        )}
      </div>
    </section>
  );
};

export default LatestArchiveSection;
