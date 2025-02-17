import type {
  PageTypes,
  HomepageTypes,
  AboutTypes,
} from '@/types/ResponsesInterface';

type PageResponseData = {
  data: PageTypes[];
};

export async function fetchPageBySlug(slug: string, locale: string = 'en') {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`
  );
  const pages: PageResponseData = await response.json();
  const page: PageTypes = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === slug
  )[0];
  return page;
}

type HomepageResponseData = {
  data: HomepageTypes;
};

export async function fetchHomePage(
  locale: string
): Promise<HomepageTypes | null> {
  try {
    const response = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}homepage?locale=${locale}&populate=*`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch homepage data: ${response.statusText}`);
    }
    const data: HomepageResponseData = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return null;
  }
}

type AboutResponseData = {
  data: AboutTypes;
};

export async function fetchAboutPage(
  locale: string
): Promise<AboutTypes | null> {
  try {
    const response = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}about?locale=${locale}&populate[page][populate]=*&populate[radioSection][populate]=*&populate[torhausSection][populate]=*&populate[heroPictures][populate]=*&populate[imageBanner][populate]=*&populate[codeOfConduct][populate]=*`
    );
    const data: AboutResponseData = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching about page data:', error);
    return null;
  }
}
