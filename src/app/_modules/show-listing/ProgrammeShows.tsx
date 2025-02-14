'use client';

import React, { useState, useEffect } from 'react';
import ProgrammeShowsList from './ProgrammeShowsList';
import { useLocale } from 'next-intl';
import BarsSpinner from '@/common/ui/BarsSpinner';
import type { ShowTypes } from '@/types/ResponsesInterface';

interface ProgrammeShowsProps {
  shows: ShowTypes[];
}

const ProgrammeShows: React.FC<ProgrammeShowsProps> = ({ shows }) => {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (shows && shows.length > 0) {
      setIsLoading(false);
      setError(null);
    } else {
      setError('Failed to load shows. Please try again later.');
    }
  }, [shows]);

  if (error) {
    return <div className='layout py-12 text-center text-white'>{error}</div>;
  }

  if (isLoading) {
    return (
      <div className='min-h-[80vh] flex items-center justify-center bg-orange-500'>
        <BarsSpinner color='thf-blue-500' />
      </div>
    );
  }

  return <ProgrammeShowsList items={shows} isActive={true} locale={locale} />;
};

export default ProgrammeShows;
