'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useData } from '@/context/DataContext';
import ShowDetails from '@/modules/show-listing/ProgrammeShowDetails';
import CloudShowChild from '@/modules/archive/CloudShowChild';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { processShows } from '@/utils/showUtils';
import { CMS_URL } from '@/utils/constants';
import type { ShowTypes, CloudShowTypes } from '@/types/ResponsesInterface';

export default function ShowContent({ content }: { content: ShowTypes }) {
  const { cloudShows, isLoadingShows, loadCloudShows } = useData();
  const [filteredShows, setFilteredShows] = useState<CloudShowTypes[]>([]);

  useEffect(() => {
    async function getFilteredShows() {
      // If shows are already in context, filter them
      if (cloudShows && cloudShows.length > 0) {
        const filtered = cloudShows.filter((show) => {
          const name = show.name.replace(/[\s-]/g, '').toLowerCase();
          const keyword = content.attributes.keyword
            .replace(/[\s-]/g, '')
            .toLowerCase();
          return new RegExp(keyword, 'i').test(name);
        });
        setFilteredShows(filtered);
        return;
      }

      // If no shows in context, load them
      await loadCloudShows();
    }

    getFilteredShows();
  }, [cloudShows, content.attributes.keyword, loadCloudShows]);

  const sortedShows = processShows(filteredShows);

  return (
    <>
      <div className='relative'>
        {content.attributes.pictureFullWidth?.data ? (
          <div className='relative min-h-fit lg:min-h-[80vh] w-full'>
            <Image
              quality={50}
              src={`${CMS_URL}${content.attributes.pictureFullWidth?.data.attributes.url}`}
              fill
              sizes='100vw'
              className='object-cover object-center'
              alt={content.attributes.title}
            />
            <div className='layout overflow-hidden pt-12 pb-6'>
              <ShowDetails currentContent={content} />
            </div>
          </div>
        ) : (
          <div className='layout relative min-h-fit lg:min-h-[60vh] w-full bg-orange-500 pt-12 pb-6'>
            <ShowDetails currentContent={content} />
          </div>
        )}
      </div>

      <div className='bg-dark-blue min-h-[30vh] lg:min-h-[40vh] layout lg:pt-60 pt-12 pb-6 lg:pb-12'>
        <div
          className={`w-full flex flex-wrap gap-6 lg:gap-12 justify-around ${
            sortedShows && sortedShows.length >= 1 ? 'pb-6 lg:pb-12' : ''
          }`}
        >
          {isLoadingShows ? (
            <div className='m-auto text-center'>
              <BarsSpinner color='#ff6314' />
            </div>
          ) : (
            <>
              {sortedShows?.map((item, i) => (
                <CloudShowChild key={i} item={item} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
