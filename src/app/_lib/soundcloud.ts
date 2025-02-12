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
    tags: show.tags.split(',').map((tag) => ({
      key: tag.trim(),
      name: tag.trim(),
      url: `tag/${tag.trim()}`,
    })),
  };
}

async function getSoundcloudToken(): Promise<string | null> {
  try {
    if (tokenCache && tokenCache.expires > Date.now()) {
      console.log('Using cached Soundcloud token');
      return tokenCache.token;
    }

    console.log('Requesting new Soundcloud token...');
    const credentials = Buffer.from(
      `${process.env.SOUNDCLOUD_CLIENT_ID}:${process.env.SOUNDCLOUD_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://secure.soundcloud.com/oauth/token', {
      method: 'POST',
      headers: {
        accept: 'application/json; charset=utf-8',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000 - 60000,
    };
    console.log('Soundcloud token:', data.access_token);
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

    console.log('Fetching new Soundcloud shows...');

    const token = await getSoundcloudToken();
    if (!token) {
      console.log('No Soundcloud token available');
      return [];
    }

    console.log('Soundcloud token:', token);

    const tracksResponse = await fetch(
      `https://api.soundcloud.com/me/tracks?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`,
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
      console.log('Soundcloud API response:', {
        status: tracksResponse.status,
        statusText: tracksResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(tracksResponse.headers),
        requestHeaders: {
          auth: `Bearer ${token.slice(0, 10)}...`,
          accept: 'application/json',
        },
      });
      return [];
    }

    const data = await tracksResponse.json();
    console.log('Soundcloud API response:', {
      responseType: typeof data,
      isArray: Array.isArray(data),
      itemCount: Array.isArray(data) ? data.length : 0,
    });

    const shows = data.map(normalizeSoundcloudShow);
    showsCache = {
      shows,
      expires: Date.now() + 60 * 60 * 1000,
    };
    return shows;
  } catch (error) {
    console.log('Error in fetchSoundcloudShows:', error);
    return [];
  }
}
