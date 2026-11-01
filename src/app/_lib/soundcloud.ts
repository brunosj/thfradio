import type {
  CloudShowTypes,
  SoundcloudShowType,
  CloudShowTag,
} from '@/types/ResponsesInterface';
import { cleanGenres } from '@/utils/genres';

// In-memory cache for OAuth token only (not shows data)
let tokenCache: { token: string; expires: number } | null = null;

// Rate limiting parameters
const rateLimitInfo = {
  lastRequestTime: 0,
  minimumDelay: 2000, // 2 seconds minimum between requests
};

// Helper function to normalize Soundcloud show data
function normalizeSoundcloudShow(show: SoundcloudShowType): CloudShowTypes {
  // Process tags from string to array of tag objects
  let formattedTags: CloudShowTag[] = [];

  if (show.tag_list && show.tag_list.trim() !== '') {
    try {
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
    } catch (error) {
      console.error('Error parsing SoundCloud tags:', error);
      // Don't let tag parsing errors break the whole show display
      formattedTags = [];
    }
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
    id: show.id,
    name: formattedTitle,
    url: show.permalink_url,
    key: show.id,
    platform: 'soundcloud' as const,
    picture: imageUrl,
    pictures: {
      extra_large: imageUrl,
    },
    date: show.created_at ?? new Date().toISOString(),
    tags: formattedTags,
    // The intranet's upload dialog writes the first genre into `genre` and
    // all of them into tag_list; older uploads have free text in either.
    genres: cleanGenres([show.genre, ...formattedTags.map((t) => t.name)]),
    durationSec: show.duration ? Math.round(show.duration / 1000) : null,
  };
}

// Wait for rate limit before making a request
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimitInfo.lastRequestTime;

  if (timeSinceLastRequest < rateLimitInfo.minimumDelay) {
    const delay = rateLimitInfo.minimumDelay - timeSinceLastRequest;
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

      // If rate limited and we have a cached token, use it
      if (response.status === 429 && tokenCache) {
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
    // Return cached token if available
    if (tokenCache) {
      return tokenCache.token;
    }
    return null;
  }
}

// Fetch SoundCloud shows - caching is handled by Next.js at the API route level
export async function fetchSoundcloudShows(): Promise<CloudShowTypes[]> {
  try {
    // Verify environment variables are set
    if (
      !process.env.SOUNDCLOUD_CLIENT_ID ||
      !process.env.SOUNDCLOUD_CLIENT_SECRET ||
      !process.env.SOUNDCLOUD_USER_ID
    ) {
      if (process.env.NODE_ENV === 'development') {
        // Local development without SoundCloud credentials: sample shows so
        // the archive (genre chips, tiles) can be reviewed. Never in production.
        console.warn('SoundCloud credentials missing: using development sample shows');
        return devSampleShows();
      }
      console.error('Missing environment variables for SoundCloud API');
      return [];
    }

    const token = await getSoundcloudToken();
    if (!token) {
      console.error('Failed to get SoundCloud token');
      return [];
    }

    // Add rate limiting delay
    await waitForRateLimit();

    const userId = process.env.SOUNDCLOUD_USER_ID;

    // Define cutoff date for filtering (May 1, 2025)
    const cutoffDate = new Date('2025-05-01T00:00:00Z');
    // SoundCloud caps page size at 200
    const pageSize = 200;
    const maxPages = 30;
    const pageDelayMs = 300;

    // Created_at parameter doesn't work with /users/{id}/tracks endpoint, and
    // results aren't strictly ordered by created_at, so fetch every page and
    // filter client-side
    let nextUrl: string | null =
      `https://api.soundcloud.com/users/${userId}/tracks?limit=${pageSize}&linked_partitioning=true`;
    const shows: CloudShowTypes[] = [];

    for (let page = 1; nextUrl && page <= maxPages; page++) {
      if (page > 1) {
        await new Promise((resolve) => setTimeout(resolve, pageDelayMs));
      }

      const tracksResponse = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!tracksResponse.ok) {
        const errorText = await tracksResponse
          .text()
          .catch(() => 'Could not get error text');
        console.error('SoundCloud API response error:', {
          page,
          status: tracksResponse.status,
          statusText: tracksResponse.statusText,
          error: errorText,
        });
        break;
      }

      const data: {
        collection?: SoundcloudShowType[];
        next_href?: string | null;
      } = await tracksResponse.json();
      const tracks = data.collection ?? [];

      // Process shows individually to prevent a single track with malformed tags from breaking everything
      for (const track of tracks) {
        try {
          const trackCreatedDate = new Date(track.created_at);
          if (trackCreatedDate >= cutoffDate) {
            shows.push(normalizeSoundcloudShow(track));
          }
        } catch (err) {
          console.error(`Error processing track ${track.id}:`, err);
          // Continue with other tracks
        }
      }

      nextUrl = data.next_href ?? null;
    }

    return shows;
  } catch (error: unknown) {
    console.error('Error fetching Soundcloud shows:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// DEVELOPMENT ONLY: sample shows for local review without SoundCloud
// credentials (see fetchSoundcloudShows). Fake track ids, images from picsum.
// ---------------------------------------------------------------------------
const DEV_SAMPLE: Array<[title: string, genre: string, tags: string]> = [
  ['Tempelhof Tapes w/ Mara Kové', 'Deep House', '"Deep House" Techno Minimal'],
  ['Feldfunk w/ Juno Ash', 'Ambient', 'Ambient Drone "Field Recording"'],
  ['Bass Lines Berlin', 'Drum & Bass', 'Jungle "UK Garage" dnb'],
  ['Morning Coffee w/ Lou', 'Jazz', 'Jazz Soul "Spiritual Jazz"'],
  ['Disco Dyke Club', 'Disco / Boogie', '"Italo Disco" Boogie "Nu Disco"'],
  ['Hörspielstunde', 'Talks', 'Hörspiel Interview "Spoken Word"'],
  ['Dub Session w/ Selector Ras', 'Reggae', 'Dub Dancehall "Lovers Rock"'],
  ['Late Night Techno', 'Techno', 'Techno "Dub Techno" Acid Hardgroove'],
  ['Afro Futures', 'Afrobeat', 'Amapiano Highlife Gqom'],
  ['Broken Hearts Club', 'Broken Beat', '"Broken Beat" Breaks Electro'],
  ['Rap Kiosk', 'Hip-Hop', '"Boom Bap" Rap Trap'],
  ['Soul Kitchen w/ Ms. Dee', 'Soul / Rhythm & Blues', 'Soul Funk Gospel'],
  ['Wave Archive', 'Alternative Rock / Punk', '"Post-Punk" "New Wave" Shoegaze'],
  ['Cumbia Cósmica', 'Latin', 'Cumbia Salsa Tropical'],
  ['Slow Motion w/ Ilka', 'Downtempo', 'Downtempo Trip-hop Balearic'],
  ['Grime Time', 'UK Dance / Grime', 'Grime Dubstep "UK Bass"'],
  ['Folklore Tapes', 'Folk', 'Folk "Singer-Songwriter" Americana'],
  ['Neue Klassik', 'Classical', 'Classical Piano Soundtrack'],
  ['Pop Up Radio', 'Pop', '"Synth-Pop" "City Pop" Hyperpop'],
  ['Electro Mechanics', 'Electro', 'Electro EBM "Miami Bass"'],
  ['House Party w/ Tobi', 'House', 'House "Chicago House" Garage'],
  ['Modular Monday', 'Experimental', 'Modular Noise Experimental'],
  ['Kiez Talk', 'Talks', 'Talks News Interview'],
  ['Funk Carioca Hour', 'Baile Funk', '"Baile Funk" Funk Brazil'],
  ['Beats & Pieces', 'Beats', 'Beats "Lo-Fi" IDM'],
  ['Trance Formation', 'Trance', 'Trance Progressive Psytrance'],
  ['Footwork Fridays', 'Footwork', 'Footwork Juke "Jersey Club"'],
  ['Rumba Rumba', 'Afro-Cuban', 'Latin Jazz Rumba'],
  ['Night Drive w/ Kai', 'Synthwave', 'Synthwave Darkwave'],
  ['Ambient Sundays', 'Ambient', '"New Age" Ambient Kosmische'],
  ['Club Culture Talk', 'Talks', 'Podcast Club'],
  ['Deep Cuts w/ Sol', 'House', 'House Disco Edits'],
  ['Jazz Gegenwart', 'Jazz', '"Free Jazz" Fusion'],
  ['Selector Series 12', 'Techno', 'Techno Rave Hardcore'],
  ['Feldstudien', 'Field Recording', '"Sound Art" Soundscape'],
  ['R&B Lounge', 'RnB', 'RnB "Neo Soul"'],
  // Guests (shows page): THF Presents nights and takeovers
  ["THF Presents: Records From Your Parent's Attic w/ James Barber", 'Reggae', 'Reggae Rocksteady'],
  ['THF Presents Kandylion', 'House', 'House Downtempo'],
  ['THF Presents Fiestuki Takeover w/ Kodemul', 'Cumbia', 'Cumbia Latin'],
  ['THF Presents: Fiestuki Invites DJ Rankng', 'Dancehall', 'Dancehall Reggaeton'],
  ['THF Presents: Amour Africain w/ JIUN', 'Afrobeat', 'Afrobeats Amapiano'],
  ['THF Presents: Partenope (w/ Naga DJ)', 'Electro', 'Electro Breaks'],
  ['THF Presents: VERSION Takeover', 'Dub', 'Dub Steppers'],
  ['THF Presents: WUB w/ dj straight girl b2b cowtome', 'Techno', 'Techno Trance'],
];

function devSampleShows(): CloudShowTypes[] {
  const day = 24 * 60 * 60 * 1000;
  const start = new Date('2026-10-27T18:00:00Z').getTime();
  return DEV_SAMPLE.map(([title, genre, tags], i) => {
    const created = new Date(start - i * 4.5 * day);
    return normalizeSoundcloudShow({
      id: `dev-${i + 1}`,
      title,
      permalink_url: `https://soundcloud.com/thfradio/dev-sample-${i + 1}`,
      artwork_url: `https://picsum.photos/seed/thf-${i + 1}/500/500?large`,
      genre,
      tag_list: tags,
      duration: (60 + (i % 4) * 30) * 60 * 1000,
      created_at: created.toISOString(),
    });
  });
}
