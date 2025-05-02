'use client';

import Hero from '@/modules/hero/Hero';
import HomeShowSection from '@/modules/show-listing/HomeShowsSection';
import HomeProgrammeSection from '@/modules/timetable/HomeProgrammeSection';
import HomeArchiveSection from '@/modules/archive/HomeArchiveSection';
import HomeNewsSection from '@/modules/news/HomeNewsSection';
import type { HomepageTypes, NewsType } from '@/types/ResponsesInterface';

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
      <HomeProgrammeSection />
      <Hero
        description={page.attributes.heroText}
        images={page.attributes.heroPictures}
        showButtons={true}
        picturePosition='right'
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
      <HomeArchiveSection
        title={page.attributes.archive.title}
        text={page.attributes.archive.text}
      />
    </>
  );
}
