import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Exclude API routes and static files
  if (
    !pathname.startsWith('/api/') &&
    !pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js|ico)$/)
  ) {
    // Check if the path doesn't start with a locale prefix

    if (!/^\/(?:en|de)(?:\/|$)/.test(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/en${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // For non-API routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
