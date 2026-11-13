import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

// A path that ends in a file extension (robots.txt, sitemap.xml, thfradio_seo.jpg,
// /images/…) is a file, not a page: it must never get a language prefix. Before,
// /robots.txt, /sitemap.xml and the share image were sent to /en/… and answered with
// a server error, which Google Search Console kept reporting.
// Pages under /en or /de keep going through next-intl (a show slug may contain a dot).
const FILE_PATH = /\.[a-z0-9]+$/i;
const LOCALE_PREFIX = /^\/(?:en|de)(?:\/|$)/;

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (FILE_PATH.test(pathname) && !LOCALE_PREFIX.test(pathname)) {
    return NextResponse.next();
  }

  // Exclude API routes
  if (!pathname.startsWith('/api/')) {
    // Check if the path doesn't start with a locale prefix

    if (!LOCALE_PREFIX.test(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/en${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // For non-API routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
