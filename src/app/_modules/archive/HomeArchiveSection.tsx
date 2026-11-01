'use client';

// Homepage: the whole archive with genre family chips (after NTS Explore),
// right under the hero. Shows load when the section comes into view.
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import BarsSpinner from '@/common/ui/BarsSpinner';
import { useData } from '@/context/DataContext';
import type { CloudShowTypes } from '@/types/ResponsesInterface';
import ArchiveBrowser, { type ArchiveProgrammeShow } from './ArchiveBrowser';

interface HomeArchiveSectionProps {
  title: string;
  text: string;
  textHtml?: string;
  backgroundColor?: string;
}

const HomeArchiveSection = ({
  title,
  backgroundColor = 'bg-dark-blue',
}: HomeArchiveSectionProps) => {
  const t = useTranslations();
  const { cloudShows, isLoadingShows, showsError } = useData();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = document.getElementById('latest');
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // The DataProvider loads the archive once on mount; this only reveals it
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`${backgroundColor} text-white scroll-mt-24 sectionPb min-h-[60lvh] border-t border-white/10`}
      id='latest'
    >
      {/* Same heading as the picks above; the CMS intro text is left out on purpose */}
      <div className='layout mx-auto w-full max-w-[1600px] pt-12 lg:pt-16 mb-4 lg:mb-6'>
        <div role='heading' aria-level={2} className='font-sans font-bold text-2xl lg:text-3xl leading-none'>
          {title || t('fromTheArchive')}
        </div>
      </div>
      <div className='layout mx-auto w-full max-w-[1600px]'>
        <ArchiveContent
          shows={cloudShows}
          loading={!isVisible || isLoadingShows || !cloudShows}
          error={!cloudShows?.length && showsError ? t('archiveLoadError') : null}
          pageSize={20}
          fullArchiveHref='/latest'
        />
      </div>
    </section>
  );
};

/** Spinner / error / the browser — shared with the archive page (All Shows). */
export function ArchiveContent({
  shows,
  loading,
  error,
  pageSize,
  autoLoad,
  fullArchiveHref,
  programme,
}: {
  shows: CloudShowTypes[] | null;
  loading: boolean;
  error: string | null;
  pageSize?: number;
  autoLoad?: boolean;
  fullArchiveHref?: string;
  programme?: ArchiveProgrammeShow[];
}) {
  if (loading || !shows)
    return (
      <div className='flex justify-center py-12'>
        <BarsSpinner color='#ff6314' />
      </div>
    );
  if (error) return <p className='py-12 text-center font-mono text-sm text-orange-400'>{error}</p>;
  return <ArchiveBrowser shows={shows} pageSize={pageSize} autoLoad={autoLoad} fullArchiveHref={fullArchiveHref} programme={programme} />;
}

export default HomeArchiveSection;
