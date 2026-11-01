import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // isomorphic-dompurify loads jsdom on the server; bundling jsdom can break
  // createWindow in production. Keep these as runtime externals.
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom', 'dompurify'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // Local dev only: lets phones in the same Wi-Fi open the dev server
  // (http://<this computer's IP>:3005) to test, e.g. playback on iOS.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
  // These settings help prevent duplicate locale prefixes in URLs
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/:path*`,
        },
        {
          source: '/:locale/uploads/:path*',
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/:path*`,
        },
      ],
    };
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cms.thfradio.com',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbnailer.mixcloud.com',
      },
      {
        protocol: 'https',
        hostname: 'cms.thfradio.com',
        pathname: '/uploads/**',
      },
      {
        // Clean show photos for Staff/Community Picks (thfradio.space)
        protocol: 'https',
        hostname: 'video.thfradio.space',
        pathname: '/**',
      },
      {
        // YouTube thumbnails (video row fallback)
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i1.sndcdn.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    qualities: [50, 75, 90],
  },
};

export default withNextIntl(nextConfig);
