'use client';

import Hero from '@/app/_modules/hero/Hero';
import HomeArchiveSection from '@/app/_modules/archive/HomeArchiveSection';
import PicksSection from '@/app/_modules/picks/PicksSection';
import MerchSection from '@/app/_modules/merch/MerchSection';
import VideosSection from '@/app/_modules/videos/VideosSection';
import type { HomepageTypes } from '@/app/_types/ResponsesInterface';
import type { Picks } from '@/lib/picks';
import type { Video } from '@/lib/videos';

interface HomeContentProps {
  page: HomepageTypes;
  picks: Picks;
  videos: Video[];
}

export default function HomeContent({ page, picks, videos }: HomeContentProps) {
  if (!page) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <PicksSection picks={picks} />
      <VideosSection videos={videos} />
      <Hero
        description={page.heroText ?? ''}
        images={{ data: page.heroPictures }}
        showButtons={true}
        picturePosition='right'
      />
      <MerchSection />
      <HomeArchiveSection
        title={page.archive.title ?? ''}
        text={page.archive.text ?? ''}
        textHtml={page.archive.textHtml}
      />
      {/* News + show gallery are switched off (to bring back: import the sections,
          fetch the news in page.tsx again)
      <HomeNewsSection
        title={page.news.title ?? ''}
        text={page.news.text ?? ''}
        textHtml={page.news.textHtml}
        newsItems={page.news.newsPreview ?? latestNews}
      /> */}
      {/* <HomeShowSection
        title={page.shows.title ?? ''}
        text={page.shows.text ?? ''}
        textHtml={page.shows.textHtml}
        pictures={galleryPictures}
      /> */}
    </>
  );
}
