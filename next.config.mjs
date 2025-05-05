import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const allowedOrigins = [
  'https://thfradio.com',
  'https://www.thfradio.com',
  'https://thfradio.de',
  'https://www.thfradio.de',
  'https://ics.teamup.com',
  'https://*.mixcloud.com',
  'https://*.soundcloud.com',
  'https://*.thfradio.com',
  'https://*.thfradio.de',
];

// const cspHeader = `
//     default-src 'self';
//     script-src 'self' 'unsafe-eval' 'unsafe-inline' ${allowedOrigins.join(' ')};
//     style-src 'self' 'unsafe-inline' ${allowedOrigins.join(' ')};
//     img-src 'self' data: blob: ${allowedOrigins.join(' ')};
//     frame-src 'self' ${allowedOrigins.join(' ')};
//     font-src 'self';
//     object-src 'none';
//     base-uri 'self';
//     form-action 'self' ${allowedOrigins.join(' ')};
//     frame-ancestors 'none';
//     connect-src 'self' ${isDevelopment ? '*' : allowedOrigins.join(' ')};
//     ${isDevelopment ? '' : 'upgrade-insecure-requests;'}
// `
//   .replace(/\s{2,}/g, ' ')
//   .trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
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
    contentSecurityPolicy: `
      default-src 'self'; 
      script-src 'self' 'unsafe-inline'; 
      img-src 'self' ${allowedOrigins.join(' ')} data:; 
      media-src 'self' ${allowedOrigins.join(' ')}; 
      connect-src 'self' ${allowedOrigins.join(' ')}; 
      font-src 'self'; 
      style-src 'self' 'unsafe-inline';
    `,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Origin, Cache-Control',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
