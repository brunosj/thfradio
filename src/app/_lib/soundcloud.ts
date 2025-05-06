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

      // Improved tag parsing for SoundCloud
      // SoundCloud often sends tags like: "Jazz & Blues" "Drum & Bass"

      // First, normalize quotes and spaces
      const normalizedTagList = show.tag_list
        .trim()
        // Replace any sequence of quotes with a single double quote
        .replace(/"+/g, '"')
        // Add spaces around quotes for easier splitting
        .replace(/"/g, ' " ')
        // Normalize spaces to single spaces
        .replace(/\s+/g, ' ')
        .trim();

      // Split by double quotes to extract quoted phrases
      const parts = normalizedTagList.split('"');
      const tags: string[] = [];

      // Process parts: every other part is inside quotes
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part === '') continue;

        // Parts at even indices are outside quotes - split by space
        // Parts at odd indices are inside quotes - keep as is
        if (i % 2 === 0) {
          // Outside quotes - split by spaces
          const words = part.split(' ').filter((w) => w !== '');
          tags.push(...words);
        } else {
          // Inside quotes - keep as one tag
          tags.push(part);
        }
      }

      // Clean up tags and format them
      formattedTags = tags
        .filter(
          (tag) => tag && !tag.includes('soundcloud:') && !tag.includes('geo:')
        )
        .map((tag) => {
          const cleanTag = tag.trim();
          return {
            key: cleanTag.toLowerCase(),
            name: cleanTag,
            url: `tag/${cleanTag.toLowerCase().replace(/\s+/g, '-')}`,
          };
        });

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

  // Get a valid date from the title or creation date
  // SoundCloud titles don't have // format like Mixcloud, so we need to append it
  // The format needs to be "Name // DD.MM.YY" for the app to recognize it

  // Extract date from SoundCloud created_at field (ISO format)
  const createdDate = new Date(show.created_at || new Date());
  const formattedDate = `${String(createdDate.getDate()).padStart(2, '0')}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getFullYear()).slice(-2)}`;

  // Check if title already includes a date in the expected format
  const hasDate = / \/\/ \d{2}\.\d{2}\.\d{2}/.test(show.title);

  // If no date in title, add it
  const formattedTitle = hasDate
    ? show.title
    : `${show.title} // ${formattedDate}`;

  console.log(`[SoundCloud] Formatted title: "${formattedTitle}"`);

  // SoundCloud often returns null or undefined for artwork_url
  // Use a default image in these cases
  let imageUrl = '/images/placeholder.jpg'; // Default fallback

  if (show.artwork_url) {
    // Get high resolution artwork if available
    imageUrl = show.artwork_url.replace('-large', '-t500x500');
  } else if (show.user && show.user.avatar_url) {
    // If no track artwork, try to use user avatar
    imageUrl = show.user.avatar_url.replace('-large', '-t500x500');
  }

  return {
    name: formattedTitle,
    url: show.permalink_url,
    key: show.id,
    platform: 'soundcloud',
    pictures: {
      extra_large: imageUrl,
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
