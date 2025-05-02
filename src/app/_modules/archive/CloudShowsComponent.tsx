import React, { useState, useRef, useEffect } from 'react';
import { CloudShowTypes, TagTypes, TagsList } from '@/types/ResponsesInterface';
import useShowFilter from '@/hooks/useShowFilter';
import CloudShowsList from './CloudShowsList';
import CloudShowsFilter from './CloudShowsFilter';
import Pagination from '@/common/ui/Pagination';

interface ShowCardProps {
  items: CloudShowTypes[];
  tagsList: TagsList;
}

const ITEMS_PER_PAGE = 28;

const CloudShowsComponent = ({ items, tagsList }: ShowCardProps) => {
  // i18n

  // State variables
  const [selectedTag, setSelectedTag] = useState<TagTypes | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(items.length / ITEMS_PER_PAGE)
  );

  const topRef = useRef<HTMLDivElement | null>(null);

  // Use hook
  const allFilteredItems = useShowFilter({ items, selectedTag });

  // If we have 8 or fewer items, just show them all without pagination
  const isLimitedView = items.length <= 8;

  // Only slice items for pagination if we're not in limited view
  const startIndex = isLimitedView ? 0 : (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = isLimitedView ? items.length : startIndex + ITEMS_PER_PAGE;
  const itemsToDisplay = allFilteredItems.slice(startIndex, endIndex);

  // Genre tags
  const sortedTags = tagsList.attributes.tag
    .map((tag) => ({
      name: tag.name,
      synonyms: tag.synonyms || [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleTagClick = (tag: TagTypes) => {
    setSelectedTag((prevTag) =>
      prevTag && prevTag.name === tag.name ? null : tag
    );
    setCurrentPage(1);
  };

  // A-Z scrolling
  const scrollToTop = () => {
    if (topRef.current) {
      const elementPositionY = topRef.current.getBoundingClientRect().top;
      window.scrollTo({
        top: elementPositionY + window.scrollY - 100,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (selectedTag) {
      scrollToTop();
    }
  }, [selectedTag]);

  // Pagination
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    scrollToTop();
  };

  useEffect(() => {
    if (selectedTag) {
      setTotalPages(Math.ceil(allFilteredItems.length / ITEMS_PER_PAGE));
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [selectedTag, allFilteredItems, currentPage, totalPages]);

  return (
    <div className='relative w-full' ref={topRef}>
      {/* Only show filters and pagination if we're not in limited view */}
      {!isLimitedView && (
        <div className='block lg:sticky top-[6.5rem] z-50 opacity-100 lg:flex pb-12'>
          <CloudShowsFilter
            sortedTags={sortedTags}
            selectedTag={selectedTag}
            handleTagClick={handleTagClick}
          />
        </div>
      )}
      <div className='layout'>
        <div className='flex items-start gap-6'>
          <CloudShowsList items={itemsToDisplay} />
        </div>
        {!isLimitedView && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
            className='py-12'
          />
        )}
      </div>
    </div>
  );
};

export default CloudShowsComponent;
