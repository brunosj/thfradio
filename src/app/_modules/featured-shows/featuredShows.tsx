import React, { useEffect, useState } from 'react';
import type {
  CloudShowTypes,
  TagsList,
  TagTypes,
} from '@/types/ResponsesInterface';
import CloudShowChild from '../archive/CloudShowChild';
import useShowFilter from '@/hooks/useShowFilter';

interface FeaturedShowsProps {
  shows: CloudShowTypes[];
  tagsList: TagsList;
}

// Helper function to calculate the current week of the year
const getCurrentWeek = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};

const FeaturedShows = ({ shows, tagsList }: FeaturedShowsProps) => {
  const [randomTag, setRandomTag] = useState<TagTypes | null>(null);
  const [randomizedItems, setRandomizedItems] = useState<CloudShowTypes[]>([]);

  const allItems = useShowFilter({
    items: shows,
    selectedTag: randomTag,
  });

  // Function to randomly select 5 items from allItems
  const randomizeItems = () => {
    const shuffled = [...allItems].sort(() => 0.5 - Math.random());
    setRandomizedItems(shuffled.slice(0, 4));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentWeek = getCurrentWeek();
      const storedWeek = localStorage.getItem('randomTagWeek');
      const storedTag = localStorage.getItem('randomTag');

      // Check if the stored week matches the current week
      if (storedWeek === String(currentWeek) && storedTag) {
        setRandomTag(JSON.parse(storedTag) as TagTypes);
      } else {
        // Pick a new random tag for the current week
        const newTag =
          tagsList.attributes.tag[
            Math.floor(Math.random() * tagsList.attributes.tag.length)
          ];
        setRandomTag(newTag);

        // Store the new tag and the current week number
        localStorage.setItem('randomTag', JSON.stringify(newTag));
        localStorage.setItem('randomTagWeek', String(currentWeek));
      }
    }
  }, [tagsList]);

  useEffect(() => {
    // Re-randomize items whenever randomTag or allItems changes
    if (randomTag) randomizeItems();
  }, [randomTag, allItems]);

  return (
    <div className='layout sectionPy bg-orange-500'>
      <div className='lg:grid grid-cols-3 gap-12 pb-6'>
        {randomTag && randomTag.name && (
          <div className='col-span-2  '>
            <div className='bg-dark-blue text-white inline-flex rounded-lg border-dark-blue border '>
              <div className='p-6 flex items-center space-x-6'>
                <p className='text-4xl font-semibold'>Mood of the week:</p>

                <p className='text-4xl'>{randomTag.name}</p>
              </div>
            </div>
          </div>
        )}
        <div className='ml-auto my-auto'>
          <button
            onClick={randomizeItems}
            className='px-4 py-2 bg-dark-blue text-white rounded'
          >
            Re-randomize Shows
          </button>
        </div>
      </div>
      <div className='flex justify-between'>
        {randomizedItems.map((item, index) => (
          <CloudShowChild key={index} item={item} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedShows;
