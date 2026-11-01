'use client';

// A single archive show (show pages list their recordings with it), same
// card as the archive.
import type { CloudShowListItem, ValidShow } from '@/types/ResponsesInterface';
import { getDateFromShow, toArchiveShow } from '@/utils/showUtils';
import ArchiveTile from './ArchiveTile';

interface ShowCardProps {
  item: CloudShowListItem;
}

const CloudShowChild = ({ item }: ShowCardProps) => {
  const date = item.date instanceof Date ? item.date : getDateFromShow(item);
  if (!date) return null;
  const show = toArchiveShow({ ...item, date } as ValidShow);
  return (
    <li className='min-w-0'>
      <ArchiveTile item={show} />
    </li>
  );
};

export default CloudShowChild;
