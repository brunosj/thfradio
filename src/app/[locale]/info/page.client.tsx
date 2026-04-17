'use client';

import Hero from '@/modules/hero/Hero';
import AboutSection from '@/modules/about-section/aboutSection';
import ImageBanner from '@/modules/image-banner/ImageBanner';
import CodeOfConductSection from '@/modules/code-of-conduct/CodeOfConductSection';
import type { AboutTypes } from '@/types/ResponsesInterface';

export default function InfoContent({ page }: { page: AboutTypes }) {
  const heroImages = { data: page.heroPictures ?? [] };
  const radio = page.radioSection;
  const tor = page.torhausSection;

  return (
    <>
      <Hero
        description={page.heroText ?? ''}
        images={heroImages}
        picturePosition='left'
        showButtons={false}
      />
      <AboutSection
        title={page.radioTitle ?? radio?.title ?? ''}
        description={radio?.description ?? ''}
        descriptionHtml={page.radioHtml}
        button={radio?.button}
        links={radio?.links}
        linksHtml={page.radioLinksHtml}
        acceptApplications={page.acceptApplications}
        className='pt-12 lg:pt-0'
      />
      {page.codeOfConduct && page.codeOfConduct.length > 0 ? (
        <CodeOfConductSection textSlides={page.codeOfConduct} />
      ) : null}
      {page.imageBanner ? (
        <ImageBanner src={page.imageBanner} alt='THF Radio at Torhaus' />
      ) : null}
      <AboutSection
        title={page.torhausTitle ?? tor?.title ?? ''}
        description={tor?.description ?? ''}
        descriptionHtml={page.torhausHtml}
        button={tor?.button}
        links={tor?.links}
        linksHtml={page.torhausLinksHtml}
        className='sectionPt'
      />
    </>
  );
}
