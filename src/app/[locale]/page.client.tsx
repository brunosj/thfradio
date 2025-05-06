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

  console.log(`
Hey there, welcome to the site of THF Radio, a community radio based in Berlin 📻

If you like it and want to see the code behind it, check it out at https://github.com/brunosj/thfradio-nextjs

For any issues or dev-related questions, please get in touch at contact@landozone.net ✨`);

  return (
    <>
      <CalendarSchedule />

      <Hero
        description={page.attributes.heroText}
        images={page.attributes.heroPictures}
        showButtons={true}
        picturePosition='right'
      />
      <HomeArchiveSection
        title={page.attributes.archive.title}
        text={page.attributes.archive.text}
      />
      <HomeNewsSection
        title={page.attributes.news.title}
        text={page.attributes.news.text}
        newsItems={latestNews}
      />
      <HomeShowSection
        title={page.attributes.shows.title}
        text={page.attributes.shows.text}
        pictures={page.attributes.pictureGallery.data}
      />
    </>
  );
}
