import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import HomeContent from './page.client';
import { fetchHomePage } from '@/lib/pages';
import { fetchPicks, mixCommunityPicks } from '@/lib/picks';
import { fetchVideos } from '@/lib/videos';
import { notFound } from 'next/navigation';
import type { HomepageTypes } from '@/types/ResponsesInterface';
type Params = Promise<{ locale: string }>;

// Rebuilt at least every 12 hours; the picks fetch (5 min) makes it more often
export const revalidate = 43200;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const page: HomepageTypes | null = await fetchHomePage(locale);

  if (!page) {
    return createMetadata({
      title: 'THF Radio',
      description: 'Community radio based in Berlin',
    });
  }

  return createMetadata({
    title: page.meta.title,
    description: page.meta.description,
  });
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  const [page, picks, videos] = await Promise.all([
    fetchHomePage(locale) as Promise<HomepageTypes | null>,
    fetchPicks(),
    fetchVideos(),
  ]);

  if (!page) {
    notFound();
  }

  // Community Picks are left out for now (Staff Picks stay)
  return <HomeContent page={page} picks={{ ...mixCommunityPicks(picks), community: [] }} videos={videos} />;
}
