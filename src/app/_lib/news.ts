import type { NewsType } from '@/types/ResponsesInterface';

type NewsItemsType = {
  data: NewsType[];
};

export async function fetchNews(locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news-items?locale=${locale}&populate=*`
  );
  const data: NewsItemsType = await response.json();
  return data.data;
}

export async function fetchNewsArticle(slug: string, locale: string) {
  const response = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`
  );
  const data: NewsItemsType = await response.json();
  return data.data[0];
}
