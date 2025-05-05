'use client';

import Hero from '@/modules/hero/Hero';
import AboutSection from '@/modules/about-section/aboutSection';
import ImageBanner from '@/modules/image-banner/ImageBanner';
import CodeOfConductSection from '@/modules/code-of-conduct/CodeOfConductSection';
import type { AboutTypes } from '@/types/ResponsesInterface';

export default function InfoContent({ page }: { page: AboutTypes }) {
  return (
    <>
      <Hero
        description={page.attributes.heroText}
        images={page.attributes.heroPictures}
        picturePosition='left'
        showButtons={false}
      />
      <AboutSection
        title={page.attributes.radioSection.title}
        description={page.attributes.radioSection.description}
        button={page.attributes.radioSection.button}
        links={page.attributes.radioSection.links}
        acceptApplications={page.attributes.acceptApplications}
        className='pt-12 lg:pt-0'
      />
      <CodeOfConductSection textSlides={page.attributes.codeOfConduct} />
      <ImageBanner
        src={page.attributes.imageBanner.data.attributes.url}
        alt='THF Radio at Torhaus'
      />
      <AboutSection
        title={page.attributes.torhausSection.title}
        description={page.attributes.torhausSection.description}
        button={page.attributes.torhausSection.button}
        links={page.attributes.torhausSection.links}
        className='sectionPt'
      />
    </>
  );
}
