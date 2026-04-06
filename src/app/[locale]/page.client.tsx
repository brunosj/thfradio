'use client';

import Hero from '@/app/_modules/hero/Hero';
import HomeShowSection from '@/app/_modules/show-listing/HomeShowsSection';
import CalendarSchedule from '@/app/_modules/timetable_v2/CalendarSchedule';
import HomeArchiveSection from '@/app/_modules/archive/HomeArchiveSection';
import HomeNewsSection from '@/app/_modules/news/HomeNewsSection';
import type { HomepageTypes, NewsType } from '@/app/_types/ResponsesInterface';

interface HomeContentProps {
  page: HomepageTypes;
  latestNews: NewsType[];
}

export default function HomeContent({ page, latestNews }: HomeContentProps) {
  if (!page) {
    return <div>Loading...</div>;
  }

  const galleryPictures = (page.pictureGallery ?? []).map((url) => ({
    url,
  }));

  return (
    <>
      <CalendarSchedule
        programmeTitle={page.programme.title}
        programmeText={page.programme.text}
        programmeTextHtml={page.programme.textHtml}
      />
      <Hero
        description={page.heroText ?? ''}
        images={{ data: page.heroPictures }}
        showButtons={true}
        picturePosition='right'
      />
      <HomeArchiveSection
        title={page.archive.title ?? ''}
        text={page.archive.text ?? ''}
        textHtml={page.archive.textHtml}
      />
      {/* <HomeNewsSection
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
