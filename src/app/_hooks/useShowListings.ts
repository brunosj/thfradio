'use client';

import { useRef, useEffect, createRef } from 'react';
import type { ShowTypes } from '@/types/ResponsesInterface';

interface RefsObject {
  [key: string]: React.RefObject<HTMLDivElement | null>;
}

const useShowListings = (
  items: ShowTypes[]
): [RefsObject, (letter: string) => void] => {
  const refs = useRef<RefsObject>({});

  useEffect(() => {
    items.forEach((item) => {
      refs.current[item.id] = createRef<HTMLDivElement>();
    });
  }, [items]);

  const scrollToShow = (letter: string) => {
    const showsWithLetter = items.filter(
      (item) => item.attributes.title[0].toLowerCase() === letter.toLowerCase()
    );

    const sortedShows = showsWithLetter.sort((a, b) =>
      a.attributes.title.localeCompare(b.attributes.title)
    );

    const show = sortedShows[0];

    if (show && refs.current[show.id]?.current) {
      const boundingRect =
        refs.current[show.id]?.current?.getBoundingClientRect();

      if (boundingRect) {
        const top = boundingRect.top + window.scrollY - 160;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  };

  return [refs.current, scrollToShow];
};

export default useShowListings;
