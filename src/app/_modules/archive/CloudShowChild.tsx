'use client';
import React from 'react';
import Image from 'next/image';
import type { CloudShowTypes } from '@/types/ResponsesInterface';
import { Play } from '@/common/assets/PlayIcon';
import { getShowName, getFormattedDateString } from '@/utils/showUtils';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useState, useEffect, useRef } from 'react';
import { useGlobalStore } from '@/hooks/useStore';
import { getMixcloudKey } from '@/utils/getMixcloudKey';
import { ActivePlayer } from '@/hooks/useStore';

interface ShowCardProps {
  item: CloudShowTypes;
}

const CloudShowChild = ({ item }: ShowCardProps) => {
  // Store state functionality
  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const showKeySet = useGlobalStore((state) => state.showKeySet);
  const trackIdSet = useGlobalStore((state) => state.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((state) => state.setCurrentShowUrl);
  const currentShowUrl = useGlobalStore((state) => state.currentShowUrl);

  const onClick = () => {
    if (item.platform === 'mixcloud') {
      showKeySet(getMixcloudKey(item.url));
    } else {
      trackIdSet(item.key);
    }
    setCurrentShowUrl(item.url);
  };

  // Image loading state handling
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Preload image when component mounts
  useEffect(() => {
    if (!item?.pictures?.extra_large) return;

    // Reset states for new image
    setImageLoaded(false);
    setImageError(false);

    // Create new image object to preload
    const img = new window.Image();
    img.src = item.pictures.extra_large;

    img.onload = () => {
      setImageLoaded(true);
    };

    img.onerror = () => {
      setImageError(true);
      setImageLoaded(true); // Consider image "loaded" even if errored, to remove spinner
    };

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [item?.pictures?.extra_large]);

  // Show info rendering
  const name = getShowName(item);
  const formattedDate = getFormattedDateString(item);

  // Limit the number of displayed tags
  const MAX_VISIBLE_TAGS = 15;

  // Filter and sort tags - sort alphabetically for consistent display
  const sortedTags =
    item.tags && Array.isArray(item.tags)
      ? [...item.tags]
          .filter((tag) => tag && typeof tag === 'object' && tag.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

  const visibleTags = sortedTags.slice(0, MAX_VISIBLE_TAGS);
  const hasMoreTags = sortedTags.length > MAX_VISIBLE_TAGS;
  const hiddenTagsCount = sortedTags.length - MAX_VISIBLE_TAGS;

  // Check if this show is currently playing
  const isPlaying =
    currentShowUrl === item.url &&
    ((item.platform === 'mixcloud' && activePlayer === ActivePlayer.MIXCLOUD) ||
      (item.platform === 'soundcloud' &&
        activePlayer === ActivePlayer.SOUNDCLOUD));

  // Placeholder image URL for fallback
  const placeholderImage = '/images/placeholder.jpg'; // Update this to your placeholder image path

  return (
    <button
      className='flex flex-col w-full md:w-[48%] lg:w-[29%] xl:w-[22%] border border-dark-blue bg-white font-mono duration-200 rounded-xl p-4 group'
      onClick={onClick}
      aria-label={`Play ${item.name}`}
    >
      {/* Image */}
      <div className='group relative flex justify-center items-center hover:cursor-pointer w-full mb-4'>
        <div className='w-full max-w-[280px] mx-auto transition-opacity duration-300 relative aspect-square'>
          {!imageLoaded && !imageError && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-100'>
              <BarsSpinner color='#1200ff' />
            </div>
          )}

          <Image
            ref={imageRef}
            unoptimized
            quality={50}
            src={imageError ? placeholderImage : item.pictures.extra_large}
            height={600}
            width={600}
            alt={name || item.name}
            className={`transition-opacity duration-300 rounded-md ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        </div>
        <div
          className={`absolute inset-0 m-auto flex w-1/3 items-center justify-center duration-300 opacity-0 group-hover:opacity-100 ${
            isPlaying ? 'opacity-100' : ' '
          }`}
        >
          {isPlaying ? (
            <BarsSpinner color='#1200ff' />
          ) : (
            <Play className='' fill='#1200ff' />
          )}
        </div>
      </div>

      <div className='flex h-full w-full flex-col text-center space-y-3 lg:space-y-6 justify-between'>
        <div className='flex space-y-3 flex-col'>
          <span className='font-light opacity-70 text-sm'>{formattedDate}</span>
          <h4 className='group-hover:text-thf-blue-500 duration-300 lg:mb-6 font-bold over break-words'>
            {name}
          </h4>
        </div>

        {/* Tags */}
        {sortedTags.length > 0 && (
          <div className='relative'>
            <ul className='flex mt-auto flex-wrap text-xs gap-2 justify-center'>
              {visibleTags.map((tag, i) => (
                <li
                  key={i}
                  className='rounded-xl border-dark-blue border px-2 py-1'
                  title={tag.name}
                >
                  {tag.name}
                </li>
              ))}
              {hasMoreTags && (
                <li
                  className='rounded-xl border-dark-blue border px-2 py-1 bg-gray-100'
                  title={`${hiddenTagsCount} more: ${sortedTags
                    .slice(MAX_VISIBLE_TAGS)
                    .map((t) => t.name)
                    .join(', ')}`}
                >
                  +{hiddenTagsCount}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </button>
  );
};

export default CloudShowChild;
