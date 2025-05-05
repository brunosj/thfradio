/**
 * Centralized configuration for allowed origins (CORS)
 * This is used across the application for consistent CORS handling
 */
const allowedOrigins = [
  'https://thfradio.com',
  'https://www.thfradio.com',
  'https://thfradio.de',
  'https://www.thfradio.de',
  'https://ics.teamup.com',
  'https://*.mixcloud.com',
  'https://*.soundcloud.com',
];

/**
 * Helper function to check if an origin is allowed
 */
function isOriginAllowed(origin) {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return origin === allowed;
  });
}

// CommonJS exports
module.exports = {
  allowedOrigins,
  isOriginAllowed,
};
