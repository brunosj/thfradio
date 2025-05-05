import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import cors from './app/config/cors.js';
const { allowedOrigins, isOriginAllowed } = cors;

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';

  // Check if it's an API request
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Check if the origin is allowed
    const isAllowedOrigin = isOriginAllowed(origin);
    const corsHeader = isAllowedOrigin ? origin : allowedOrigins[0];

    // For API routes, handle CORS for redirects
    const response = NextResponse.next();

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', corsHeader);
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    response.headers.set('Vary', 'Origin');

    return response;
  }

  // For non-API routes, use the intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(de|en)/:path*', '/api/:path*'],
};
