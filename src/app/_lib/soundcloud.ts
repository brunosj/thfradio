import type {
  CloudShowTypes,
  SoundcloudShowType,
} from '@/types/ResponsesInterface';

// In-memory cache
let tokenCache: { token: string; expires: number } | null = null;
let showsCache: { shows: CloudShowTypes[]; expires: number } | null = null;

// Rate limiting parameters
const rateLimitInfo = {
  lastRequestTime: 0,
  minimumDelay: 2000, // 2 seconds minimum between requests
  retryDelay: 5000, // 5 seconds on rate limit
  cacheExtensionOnRateLimit: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper function to normalize Soundcloud show data
function normalizeSoundcloudShow(show: SoundcloudShowType): CloudShowTypes {
  return {
    name: show.title,
    url: show.permalink_url,
    key: show.id,
    platform: 'soundcloud',
    pictures: {
      extra_large: show.artwork_url?.replace('-large', '-t500x500') || '',
    },
    tags:
      show.tags?.split(',').map((tag) => ({
        key: tag.trim(),
        name: tag.trim(),
        url: `tag/${tag.trim()}`,
      })) || [],
  };
}

// Wait for rate limit before making a request
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitInfo.lastRequestTime;

  if (timeSinceLastRequest < rateLimitInfo.minimumDelay) {
    const delay = rateLimitInfo.minimumDelay - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  rateLimitInfo.lastRequestTime = Date.now();
}

async function getSoundcloudToken(): Promise<string | null> {
  try {
    if (tokenCache && tokenCache.expires > Date.now()) {
      return tokenCache.token;
    }

    // Add rate limiting delay
    await waitForRateLimit();

    const response = await fetch('https://api.soundcloud.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SOUNDCLOUD_CLIENT_ID!,
        client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token request failed:', error);

      // If rate limited, use cached token even if expired with longer extension
      if (response.status === 429 && tokenCache) {
        console.warn(
          'Rate limited, using expired token with extended expiration'
        );
        // Extend token expiration
        tokenCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return tokenCache.token;
      }

      return null;
    }

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting Soundcloud token:', error);
    // Return cached token if available, even if expired
    if (tokenCache) {
      console.warn(
        'Error occurred, using cached token with extended expiration'
      );
      // Extend token expiration
      tokenCache.expires = Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
      return tokenCache.token;
    }
    return null;
  }
}

// Add error handling for rate limits
export async function fetchSoundcloudShows(): Promise<CloudShowTypes[]> {
  try {
    // Check cache first with longer expiration during rate limits
    if (showsCache && Date.now() < showsCache.expires) {
      return showsCache.shows;
    }

    const token = await getSoundcloudToken();
    if (!token) {
      // Use cached shows if available, even if expired
      if (showsCache) {
        console.warn('Using expired shows cache due to token failure');
        // Extend cache expiration
        showsCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return showsCache.shows;
      }
      return [];
    }

    // Add rate limiting delay
    await waitForRateLimit();

    const userId = process.env.SOUNDCLOUD_USER_ID;
    const tracksResponse = await fetch(
      `https://api.soundcloud.com/users/${userId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!tracksResponse.ok) {
      if (tracksResponse.status === 429 && showsCache) {
        console.warn(
          'Rate limited, using cached shows with extended expiration'
        );
        // Extend cache expiration
        showsCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return showsCache.shows;
      }

      const errorText = await tracksResponse
        .text()
        .catch(() => 'Could not get error text');
      console.error('Soundcloud API response error:', {
        status: tracksResponse.status,
        statusText: tracksResponse.statusText,
        error: errorText,
      });

      // Return cached data if available with extended expiration
      if (showsCache) {
        showsCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return showsCache.shows;
      }
      return [];
    }

    const data = await tracksResponse.json();

    const shows = data.map(normalizeSoundcloudShow);

    // Cache for 1 hour normally
    showsCache = {
      shows,
      expires: Date.now() + 60 * 60 * 1000,
    };

    return shows;
  } catch (error: unknown) {
    console.error('Error fetching Soundcloud shows:', error);
    // Return cached data if available with extended expiration
    if (showsCache) {
      console.warn(
        'Error occurred, using cached shows with extended expiration'
      );
      showsCache.expires = Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
      return showsCache.shows;
    }
    return [];
  }
}
