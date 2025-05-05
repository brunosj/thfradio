import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  // For non-API routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(de|en)/:path*'],
};
