import type { TagTypes } from '@/types/ResponsesInterface';
import React from 'react';

interface CloudShowsFilterProps {
  sortedTags: TagTypes[];
  selectedTag: TagTypes | null;
  handleTagClick: (tag: TagTypes) => void;
}

const CloudShowsFilter = ({
  sortedTags,
  selectedTag,
  handleTagClick,
}: CloudShowsFilterProps) => {
  return (
    <div className='w-full bg-orange-500 '>
      <div className='flex flex-wrap justify-center gap-x-2  max-w-6xl m-auto py-3 layout gap-y-2 lg:gap-y-3 '>
        {sortedTags.map((tag) => (
          <button
            key={tag.name}
            className={`border-dark-blue border text-xs font-mono rounded-xl px-2 hover:bg-thf-blue-500 hover:text-white duration-300 hover:cursor-pointer  ${
              tag.name === selectedTag?.name
                ? 'bg-thf-blue-500 text-white'
                : 'bg-white'
            }`}
            onClick={() => handleTagClick(tag)}
            aria-label={`Select genre ${tag.name}`}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CloudShowsFilter;
