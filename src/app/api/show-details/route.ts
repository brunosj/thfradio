import { NextRequest, NextResponse } from 'next/server';
import { fetchCloudShowsCached } from '@/lib/shows';
import type { CloudShowTypes } from '@/types/ResponsesInterface';

// In-memory cache for show details
const detailsCache: {
  [url: string]: {
    data: CloudShowTypes;
    expires: number;
  };
} = {};

// Cache expiration (6 hours)
const CACHE_EXPIRATION = 6 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  console.log('Show details request for URL:', url);

  if (!url) {
    console.error('Missing url parameter');
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  // Check cache first
  if (detailsCache[url] && detailsCache[url].expires > Date.now()) {
    console.log('Using cached show details for URL:', url);
    return NextResponse.json({ show: detailsCache[url].data });
  }

  try {
    // Extract the track ID if it's a SoundCloud URL
    let soundcloudId: string | null = null;

    if (url.includes('soundcloud.com')) {
      // Extract the path part of the URL (everything after soundcloud.com/)
      const matches = url.match(/soundcloud\.com\/([^?#]+)/);
      if (matches && matches[1]) {
        const path = matches[1];

        // Get the last part of the path which is typically the track slug
        const segments = path.split('/');
        if (segments.length >= 2) {
          // The format may be user/track-name or group/track-name
          soundcloudId = segments[segments.length - 1];
          console.log('Extracted potential SoundCloud ID:', soundcloudId);
        }
      }
    }

    // Use the cached function to get all shows
    const allShows = await fetchCloudShowsCached();

    // Find the show with the matching URL - case-insensitive matching
    let show = allShows.find((s) => s.url.toLowerCase() === url.toLowerCase());

    // If not found, try to find by parts of the URL if it's a SoundCloud URL
    if (!show && soundcloudId) {
      console.log('Trying to find show by SoundCloud ID part:', soundcloudId);
      show = allShows.find(
        (s) =>
          s.platform === 'soundcloud' &&
          s.url.toLowerCase().includes(soundcloudId.toLowerCase())
      );
    }

    if (!show) {
      console.log('Show not found, creating basic placeholder from URL');

      // Create a basic show object as a fallback
      const urlParts = url.split('/');
      const name = urlParts[urlParts.length - 1]
        .replace(/-/g, ' ')
        .replace(/[_]/g, ' ')
        .split('?')[0]
        .trim();

      // Create placeholder show object
      show = {
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
        url: url,
        key: url,
        platform: 'soundcloud', // Default to soundcloud for safety
        pictures: {
          extra_large: '',
        },
        tags: [],
      };

      // Don't cache placeholders to allow for future correct matches
    } else {
      // Cache the show data
      detailsCache[url] = {
        data: show,
        expires: Date.now() + CACHE_EXPIRATION,
      };
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error('Error fetching show details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show details' },
      { status: 500 }
    );
  }
}
