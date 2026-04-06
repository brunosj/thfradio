import React from 'react';
import type { CloudShowListItem } from '@/types/ResponsesInterface';
import CloudShowChild from './CloudShowChild';

interface ShowCardListProps {
  items: CloudShowListItem[];
}

const CloudShowsList = ({ items }: ShowCardListProps) => {
  return (
    <div className='w-full flex flex-wrap gap-6 lg:gap-12 justify-center'>
      {items.map((item) => (
        <CloudShowChild key={item.key ?? item.url} item={item} />
      ))}
    </div>
  );
};

export default CloudShowsList;
