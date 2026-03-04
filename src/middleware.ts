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
  const pathHasStaticFile = pathname.match(
    /\.(jpg|jpeg|png|gif|svg|css|js|ico)$/
  );

  // Exclude API routes and static files
  if (!pathname.startsWith('/api/') && !pathHasStaticFile) {
    // Check if the path doesn't start with a locale prefix

    if (!/^\/(?:en|de)(?:\/|$)/.test(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/en${pathname}`;
      return NextResponse.redirect(url);
    }

    const localeMatch = pathname.match(/^\/(en|de)(?:\/|$)/);
    if (localeMatch) {
      const locale = localeMatch[1];
      const localizedPath =
        pathname.replace(/^\/(?:en|de)/, '') === ''
          ? '/'
          : pathname.replace(/^\/(?:en|de)/, '');
      const normalizedPath =
        localizedPath.length > 1 && localizedPath.endsWith('/')
          ? localizedPath.slice(0, -1)
          : localizedPath;
      const isAllowedPath = normalizedPath === '/' || normalizedPath === '/latest';

      if (!isAllowedPath) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}`;
        return NextResponse.redirect(url);
      }
    }
  }

  // For non-API routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
