import type {
  CloudShowTypes,
  SoundcloudShowType,
  CloudShowTag,
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
  // Process tags from string to array of tag objects
  let formattedTags: CloudShowTag[] = [];

  if (show.tag_list && show.tag_list.trim() !== '') {
    try {
      // Log the raw tag_list for debugging in production
      console.log(
        `[SoundCloud] Processing tags for "${show.title}": ${show.tag_list}`
      );

      // Clean up the tag list string first
      const cleanTagList = show.tag_list
        .trim()
        // Fix malformed quotes - ensure all quotes are properly paired
        .replace(/"+/g, '"')
        // Remove trailing quotes at the end
        .replace(/"$/g, '');

      // Simpler and more robust tag parsing approach
      // Split by space, but respect quotes for multi-word tags
      const tagMatches: string[] = [];

      // Use regex to match quoted phrases and single words
      const regex = /"([^"]+)"|(\S+)/g;
      let match;

      while ((match = regex.exec(cleanTagList)) !== null) {
        // match[1] is the content of a quoted string, match[2] is a single word
        const tag = match[1] || match[2];
        if (tag && !tag.includes('soundcloud:') && !tag.includes('geo:')) {
          tagMatches.push(tag.trim());
        }
      }

      // Format the tags
      formattedTags = tagMatches.map((tag) => {
        // Clean up any remaining quotes or commas
        const cleanTag = tag.replace(/[",]/g, '').trim();
        return {
          key: cleanTag.toLowerCase(),
          name: cleanTag,
          url: `tag/${cleanTag.toLowerCase().replace(/\s+/g, '-')}`,
        };
      });

      // Debug
      console.log(
        `[SoundCloud] Parsed ${formattedTags.length} tags for "${show.title}". Tags: ${formattedTags.map((t) => t.name).join(', ')}`
      );
    } catch (error) {
      console.error('Error parsing SoundCloud tags:', error);
      console.error('Raw tag list:', show.tag_list);
      // Don't let tag parsing errors break the whole show display
      formattedTags = [];
    }
  } else {
    console.log(`[SoundCloud] No tags for "${show.title}"`);
  }

  return {
    name: show.title,
    url: show.permalink_url,
    key: show.id,
    platform: 'soundcloud',
    pictures: {
      extra_large: show.artwork_url?.replace('-large', '-t500x500') || '',
    },
    tags: formattedTags,
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
      console.log('[SoundCloud] Using cached shows data');
      return showsCache.shows;
    }

    // Verify environment variables are set
    if (
      !process.env.SOUNDCLOUD_CLIENT_ID ||
      !process.env.SOUNDCLOUD_CLIENT_SECRET ||
      !process.env.SOUNDCLOUD_USER_ID
    ) {
      console.error(
        '[SoundCloud] Missing environment variables for SoundCloud API'
      );

      // Use cached shows if available, even if expired
      if (showsCache) {
        console.warn(
          '[SoundCloud] Using expired shows cache due to missing env variables'
        );
        showsCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return showsCache.shows;
      }
      return [];
    }

    const token = await getSoundcloudToken();
    if (!token) {
      // Use cached shows if available, even if expired
      if (showsCache) {
        console.warn(
          '[SoundCloud] Using expired shows cache due to token failure'
        );
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
          '[SoundCloud] Rate limited, using cached shows with extended expiration'
        );
        // Extend cache expiration
        showsCache.expires =
          Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
        return showsCache.shows;
      }

      const errorText = await tracksResponse
        .text()
        .catch(() => 'Could not get error text');
      console.error('[SoundCloud] API response error:', {
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
    console.log(`[SoundCloud] Fetched ${data.length} tracks from API`);

    // Process shows individually to prevent a single track with malformed tags from breaking everything
    const shows: CloudShowTypes[] = [];
    for (const track of data) {
      try {
        shows.push(normalizeSoundcloudShow(track));
      } catch (err) {
        console.error(`[SoundCloud] Error processing track ${track.id}:`, err);
        // Continue with other tracks
      }
    }

    // Cache for 1 hour normally
    showsCache = {
      shows,
      expires: Date.now() + 60 * 60 * 1000,
    };

    return shows;
  } catch (error: unknown) {
    console.error('[SoundCloud] Error fetching Soundcloud shows:', error);
    // Return cached data if available with extended expiration
    if (showsCache) {
      console.warn(
        '[SoundCloud] Error occurred, using cached shows with extended expiration'
      );
      showsCache.expires = Date.now() + rateLimitInfo.cacheExtensionOnRateLimit;
      return showsCache.shows;
    }
    return [];
  }
}
