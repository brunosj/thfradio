import type { MetadataRoute } from 'next';
import { siteMetadata } from '@/utils/siteMetadata';

const SITE = siteMetadata.siteUrl.replace(/\/$/, '');

// /robots.txt – everything is public except the API routes (data for the site itself).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
