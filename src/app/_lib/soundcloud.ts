import type {
  CloudShowTypes,
  SoundcloudShowType,
} from '@/types/ResponsesInterface';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TOKEN_CACHE_FILE = join(process.cwd(), '.soundcloud-token-cache.json');

// Load token from file system
function loadTokenCache() {
  try {
    const data = readFileSync(TOKEN_CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Save token to file system
function saveTokenCache(token: string, expires: number) {
  try {
    writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, expires }));
  } catch (error) {
    console.error('Failed to save token cache:', error);
  }
}

// Initialize tokenCache from file
let tokenCache = loadTokenCache();

// Cache for shows
let showsCache: { shows: CloudShowTypes[]; expires: number } | null = null;

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

async function getSoundcloudToken(): Promise<string | null> {
  try {
    if (tokenCache && tokenCache.expires > Date.now()) {
      return tokenCache.token;
    }

    // Add rate limiting delay
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay between requests

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

      // If rate limited, use cached token even if expired
      if (response.status === 429 && tokenCache) {
        console.warn('Rate limited, using expired token');
        return tokenCache.token;
      }

      return null;
    }

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    };

    // Save to file system
    saveTokenCache(tokenCache.token, tokenCache.expires);

    return data.access_token;
  } catch (error) {
    console.error('Error getting Soundcloud token:', error);
    // Return cached token if available, even if expired
    return tokenCache?.token || null;
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
        return showsCache.shows;
      }
      return [];
    }

    // Add rate limiting delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
        console.warn('Rate limited, using cached shows');
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

      // Return cached data if available
      return showsCache?.shows || [];
    }

    const data = await tracksResponse.json();

    const shows = data.map(normalizeSoundcloudShow);

    // Extend cache duration during rate limits
    showsCache = {
      shows,
      expires: Date.now() + 60 * 60 * 1000,
    };

    return shows;
  } catch (error: unknown) {
    console.error('Error fetching Soundcloud shows:', error);
    // Return cached data if available
    return showsCache?.shows || [];
  }
}
