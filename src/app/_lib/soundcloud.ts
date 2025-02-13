import type {
  CloudShowTypes,
  SoundcloudShowType,
} from '@/types/ResponsesInterface';

// Cache for token and shows
let tokenCache: { token: string; expires: number } | null = null;
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
      console.log('Using cached Soundcloud token');
      return tokenCache.token;
    }

    console.log('Requesting new Soundcloud token...');

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
      return null;
    }

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000 - 60000, // Buffer of 1 minute
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting Soundcloud token:', error);
    return null;
  }
}

export async function fetchSoundcloudShows(): Promise<CloudShowTypes[]> {
  try {
    if (showsCache && showsCache.expires > Date.now()) {
      console.log('Returning cached Soundcloud shows');
      return showsCache.shows;
    }

    const token = await getSoundcloudToken();
    if (!token) {
      console.log('No Soundcloud token available');
      return [];
    }

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
      const errorText = await tracksResponse
        .text()
        .catch(() => 'Could not get error text');
      console.error('Soundcloud API response error:', {
        status: tracksResponse.status,
        statusText: tracksResponse.statusText,
        error: errorText,
      });
      return [];
    }

    const data = await tracksResponse.json();
    const shows = data.map(normalizeSoundcloudShow);

    showsCache = {
      shows,
      expires: Date.now() + 60 * 60 * 1000, // Cache for 1 hour
    };

    return shows;
  } catch (error) {
    console.error('Error in fetchSoundcloudShows:', error);
    return [];
  }
}
