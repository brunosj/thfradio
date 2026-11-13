import type { MetadataRoute } from 'next';
import { siteMetadata } from '@/utils/siteMetadata';
import { fetchProgrammeShows } from '@/lib/shows';
import { fetchNews } from '@/lib/news';

const SITE = siteMetadata.siteUrl.replace(/\/$/, '');
const LOCALES = ['en', 'de'] as const;

// Rebuilt at most once an hour – shows come and go via thfradio.space.
export const revalidate = 3600;

// /sitemap.xml – every page in both languages, each entry pointing at its other-language twin.
function entry(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, `${SITE}/${l}${path}`]));
  return LOCALES.map((locale) => ({
    url: `${SITE}/${locale}${path}`,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

const STATIC_PAGES: Array<[string, number, MetadataRoute.Sitemap[number]['changeFrequency']]> = [
  ['', 1, 'daily'],
  ['/shows', 0.8, 'daily'],
  ['/latest', 0.8, 'daily'],
  ['/news', 0.6, 'weekly'],
  ['/info', 0.5, 'monthly'],
  ['/awareness', 0.3, 'yearly'],
  ['/imprint', 0.2, 'yearly'],
  ['/privacy', 0.2, 'yearly'],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = STATIC_PAGES.flatMap(([path, priority, freq]) => entry(path, priority, freq));

  // Shows and news are extra: if a source is down, the sitemap still lists the main pages
  // instead of failing (a broken sitemap is what Search Console complained about).
  const [shows, news] = await Promise.all([
    fetchProgrammeShows('en').catch(() => []),
    fetchNews('en').catch(() => []),
  ]);

  const showSlugs = [...new Set(shows.map((s) => s?.slug).filter((s): s is string => !!s))];
  const newsSlugs = [
    ...new Set(
      (news as Array<{ slug?: string; attributes?: { slug?: string } }>)
        .map((n) => n?.attributes?.slug || n?.slug)
        .filter((s): s is string => !!s),
    ),
  ];

  return [
    ...pages,
    ...showSlugs.flatMap((slug) => entry(`/shows/${encodeURIComponent(slug)}`, 0.6, 'weekly')),
    ...newsSlugs.flatMap((slug) => entry(`/news/${encodeURIComponent(slug)}`, 0.4, 'monthly')),
  ];
}
