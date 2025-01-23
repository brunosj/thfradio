'use client';

import React from 'react';
import type { ShowTypes } from '@/types/ResponsesInterface';
import ProgrammeShowsList from './ProgrammeShowsList';
import { useLocale } from 'next-intl';

interface ProgrammeShowsProps {
  items: ShowTypes[];
}

const ProgrammeShows: React.FC<ProgrammeShowsProps> = ({ items }) => {
  const locale = useLocale();

  return (
    <>
      <ProgrammeShowsList items={items} isActive={true} locale={locale} />
      {/* <ProgrammeShowsList
        items={inactiveShows}
        isActive={false}
        locale={locale}
      /> */}
    </>
  );
};

export default ProgrammeShows;
