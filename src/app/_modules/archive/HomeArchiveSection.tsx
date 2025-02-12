import { useState, useEffect } from 'react';
import SectionHeader from '@/common/layout/section/SectionHeader';
import type { CloudShowTypes, TagsList } from '@/types/ResponsesInterface';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { processShows } from '@/utils/showUtils';
import CloudShowsComponent from './CloudShowsComponent';
interface ArchiveProps {
  title: string;
  text: string;
  shows: CloudShowTypes[];
  tagsList: TagsList;
}

const HomeArchiveSection = ({ title, text, shows, tagsList }: ArchiveProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (shows && shows.length > 0) {
      setIsLoading(false);
    }
  }, [shows]);

  const sortedShows = processShows(shows);

  return (
    <section className='bg-dark-blue scroll-mt-24' id='latest'>
      <SectionHeader title={title} text={text} />
      <div className='flex w-full m-auto'>
        {isLoading ? (
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
