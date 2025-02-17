'use client';

import { useState, useEffect } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { processShows } from '@/utils/showUtils';
import CloudShowsComponent from './CloudShowsComponent';
import { useData } from '@/context/DataContext';

interface ArchiveProps {
  title: string;
  text: string;
}

const HomeArchiveSection = ({ title, text }: ArchiveProps) => {
  const { cloudShows, isLoadingShows, tagsList, loadCloudShows } = useData();
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          loadCloudShows().catch((err) => {
            setError('Failed to load shows. Please try again later.');
            console.error('Error loading shows:', err);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('shows');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [loadCloudShows]);

  const sortedShows = cloudShows ? processShows(cloudShows) : [];

  return (
    <section className='bg-dark-blue scroll-mt-24' id='latest'>
      <SectionHeader title={title} text={text} />
      <div className='flex w-full m-auto'>
        {error ? (
          <div className='m-auto text-center pb-12 text-red-500'>{error}</div>
        ) : !isVisible || isLoadingShows || !cloudShows ? (
          <div className='m-auto text-center pb-12'>
            <BarsSpinner color='#1200ff' />
          </div>
        ) : (
          <CloudShowsComponent items={sortedShows} tagsList={tagsList} />
        )}
      </div>
    </section>
  );
};

export default HomeArchiveSection;
