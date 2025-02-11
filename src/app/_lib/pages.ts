import type {
  PageTypes,
  HomepageTypes,
  AboutTypes,
} from '@/types/ResponsesInterface';

export async function fetchPageBySlug(slug: string, locale: string = 'en') {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`
  );
  const pages = await response.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === slug
  );
  return page;
}

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
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return null;
  }
}

export async function fetchAboutPage(
  locale: string
): Promise<AboutTypes | null> {
  try {
    const response = await fetch(
      `${process.env.STRAPI_PUBLIC_API_URL}about?locale=${locale}&populate[page][populate]=*&populate[radioSection][populate]=*&populate[torhausSection][populate]=*&populate[heroPictures][populate]=*&populate[imageBanner][populate]=*&populate[codeOfConduct][populate]=*`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching about page data:', error);
    return null;
  }
}
