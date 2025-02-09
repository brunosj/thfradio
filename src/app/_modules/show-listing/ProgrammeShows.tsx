'use client';

import React from 'react';
import ProgrammeShowsList from './ProgrammeShowsList';
import { useLocale } from 'next-intl';
import { useData } from '@/app/_context/DataContext';

const ProgrammeShows: React.FC = () => {
  const { programmeShows } = useData();
  const locale = useLocale();

  return (
    <>
      <ProgrammeShowsList
        items={programmeShows}
        isActive={true}
        locale={locale}
      />
      {/* <ProgrammeShowsList
        items={inactiveShows}
        isActive={false}
        locale={locale}
      /> */}
    </>
  );
};

export default ProgrammeShows;
