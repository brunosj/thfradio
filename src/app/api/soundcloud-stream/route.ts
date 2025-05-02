import { NextRequest, NextResponse } from 'next/server';

// In-memory token cache to reduce API calls
let tokenCache: { token: string; expires: number } | null = null;

// Add in-memory track cache to reduce API calls
const trackCache: {
  [trackId: string]: {
    data: Record<string, unknown>;
    streams: Record<string, string> | null;
    expires: number;
  };
} = {};

// Cache expiration time (12 hours)
const CACHE_EXPIRATION = 12 * 60 * 60 * 1000;

// Rate limiting mechanism
const rateLimitInfo = {
  lastRequestTime: 0,
  minimumDelay: 1000, // 1 second minimum between requests
};

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
      console.log('Using cached Soundcloud token');
      return tokenCache.token;
    }

    console.log('Fetching new Soundcloud token');
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

      // If we have a cached token, use it even if expired
      if (tokenCache) {
        console.warn('Using expired token due to API error');
        return tokenCache.token;
      }

      return null;
    }

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    };

    console.log('New Soundcloud token obtained');
    return data.access_token;
  } catch (error) {
    console.error('Error getting Soundcloud token:', error);

    // If we have a cached token, use it even if expired
    if (tokenCache) {
      console.warn('Using expired token due to error');
      return tokenCache.token;
    }

    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trackId = searchParams.get('trackId');

  console.log('Soundcloud stream request for trackId:', trackId);
  console.log('Environment variables check:', {
    hasClientId: !!process.env.SOUNDCLOUD_CLIENT_ID,
    hasClientSecret: !!process.env.SOUNDCLOUD_CLIENT_SECRET,
  });

  if (!trackId) {
    console.error('Missing trackId parameter');
    return NextResponse.json(
      { error: 'Missing trackId parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if we have the track cached
    if (trackCache[trackId] && trackCache[trackId].expires > Date.now()) {
      console.log(`Using cached data for track ${trackId}`);
      const cachedData = trackCache[trackId];

      // If we have cached streams, create response from cache
      if (cachedData.streams) {
        console.log('Using cached stream data');
        const streamsData = cachedData.streams;
        const trackData = cachedData.data;

        // Prioritize formats in this order: http_mp3_128_url, preview_mp3_128_url, hls_mp3_128_url
        let streamUrl = '';
        let streamFormat = '';

        if (streamsData.http_mp3_128_url) {
          streamUrl = streamsData.http_mp3_128_url;
          streamFormat = 'http_mp3_128';
        } else if (streamsData.preview_mp3_128_url) {
          streamUrl = streamsData.preview_mp3_128_url;
          streamFormat = 'preview_mp3_128';
        } else if (streamsData.hls_mp3_128_url) {
          streamUrl = streamsData.hls_mp3_128_url;
          streamFormat = 'hls_mp3_128';
        } else {
          // If none of the preferred formats are available, use the first available format
          const formats = Object.keys(streamsData).filter((key) =>
            key.endsWith('_url')
          );
          if (formats.length > 0) {
            const format = formats[0];
            streamUrl = streamsData[format];
            streamFormat = format.replace('_url', '');
          }
        }

        if (streamUrl) {
          const widgetUrl = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

          return NextResponse.json({
            streamUrl,
            streamFormat,
            availableFormats: Object.keys(streamsData).filter((key) =>
              key.endsWith('_url')
            ),
            widgetUrl,
            trackId,
            title: trackData.title,
            duration: trackData.duration,
            artwork_url: trackData.artwork_url,
            cached: true,
          });
        }
      }

      // If we have just track data but no streams, we can still return the widget URL
      if (cachedData.data && !cachedData.streams) {
        console.log('Using cached track data with widget fallback');
        return NextResponse.json({
          error: 'No stream URL in cache, using widget',
          widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
          title: cachedData.data.title,
          artwork_url: cachedData.data.artwork_url,
          cached: true,
        });
      }
    }

    // Get OAuth token using client credentials flow
    const token = await getSoundcloudToken();

    if (!token) {
      console.error('Failed to get SoundCloud token');
      return NextResponse.json(
        { error: 'Failed to get SoundCloud token' },
        { status: 401 }
      );
    }

    // First, get the track details to verify it exists and is streamable
    console.log(`Fetching track details for trackId: ${trackId}`);
    await waitForRateLimit();

    const trackResponse = await fetch(
      `https://api.soundcloud.com/tracks/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json; charset=utf-8',
        },
      }
    );

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      console.error(
        `Failed to fetch track details: ${trackResponse.status} - ${errorText}`
      );

      // If rate limited and we have cached data, use it even if expired
      if (trackResponse.status === 429 && trackCache[trackId]) {
        console.warn('Rate limited, using expired cache for track');
        const cachedData = trackCache[trackId];

        if (cachedData.streams) {
          // Same logic as above for returning cached stream data
          // [Simplified for brevity - would repeat the cached stream logic]
          console.log('Using expired stream data due to rate limit');
          const streamsData = cachedData.streams;
          const trackData = cachedData.data;

          // Just use the first available stream
          const formats = Object.keys(streamsData).filter((key) =>
            key.endsWith('_url')
          );
          if (formats.length > 0) {
            const format = formats[0];
            const streamUrl = streamsData[format];
            const streamFormat = format.replace('_url', '');

            return NextResponse.json({
              streamUrl,
              streamFormat,
              availableFormats: formats.map((f) => f.replace('_url', '')),
              widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
              trackId,
              title: trackData.title,
              artwork_url: trackData.artwork_url,
              cached: true,
              expired: true,
            });
          }
        }

        // If we don't have stream data, return widget URL
        if (cachedData.data) {
          return NextResponse.json({
            error: 'Rate limited, using widget',
            widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
            title: cachedData.data.title,
            artwork_url: cachedData.data.artwork_url,
          });
        }
      }

      // If no cache or not rate limited, return the widget URL
      return NextResponse.json(
        {
          error: `Failed to fetch track details: ${trackResponse.status}`,
          widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
        },
        { status: 200 } // Return 200 with widget URL so player can fall back
      );
    }

    const trackData = await trackResponse.json();
    console.log('Track data received:', {
      id: trackData.id,
      title: trackData.title,
      streamable: trackData.streamable,
    });

    // Cache the track data
    if (!trackCache[trackId]) {
      trackCache[trackId] = {
        data: trackData,
        streams: null,
        expires: Date.now() + CACHE_EXPIRATION,
      };
    } else {
      trackCache[trackId].data = trackData;
      trackCache[trackId].expires = Date.now() + CACHE_EXPIRATION;
    }

    // Check if the track is streamable
    if (!trackData.streamable) {
      console.error('Track is not streamable');
      return NextResponse.json(
        {
          error: 'This track is not streamable',
          widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
          title: trackData.title,
          artwork_url: trackData.artwork_url,
        },
        { status: 200 }
      );
    }

    // Get the streaming URLs directly from the streams endpoint
    console.log('Fetching streaming URLs from streams endpoint');
    await waitForRateLimit();

    const streamsResponse = await fetch(
      `https://api.soundcloud.com/tracks/${trackId}/streams`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json; charset=utf-8',
        },
      }
    );

    if (!streamsResponse.ok) {
      const errorText = await streamsResponse.text();
      console.error(
        `Failed to fetch streams: ${streamsResponse.status} - ${errorText}`
      );

      // If we can't get streams, try the traditional method with stream_url
      if (trackData.stream_url) {
        console.log('Falling back to stream_url method');
        const streamUrl = `${trackData.stream_url}?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`;

        // Create a widget URL as a fallback option
        const widgetUrl = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

        return NextResponse.json({
          streamUrl,
          streamFormat: 'stream_url',
          availableFormats: ['stream_url'],
          widgetUrl,
          trackId,
          title: trackData.title,
          duration: trackData.duration,
          artwork_url: trackData.artwork_url,
        });
      }

      return NextResponse.json(
        {
          error: `Failed to fetch streams: ${streamsResponse.status}`,
          widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
          title: trackData.title,
          artwork_url: trackData.artwork_url,
        },
        { status: 200 } // Return 200 with widget URL so player can fall back
      );
    }

    const streamsData = await streamsResponse.json();
    console.log('Available stream formats:', Object.keys(streamsData));

    // Cache the streams data
    if (trackCache[trackId]) {
      trackCache[trackId].streams = streamsData;
      trackCache[trackId].expires = Date.now() + CACHE_EXPIRATION;
    }

    // Prioritize formats in this order: http_mp3_128_url, preview_mp3_128_url, hls_mp3_128_url
    let streamUrl = '';
    let streamFormat = '';

    if (streamsData.http_mp3_128_url) {
      streamUrl = streamsData.http_mp3_128_url;
      streamFormat = 'http_mp3_128';
    } else if (streamsData.preview_mp3_128_url) {
      streamUrl = streamsData.preview_mp3_128_url;
      streamFormat = 'preview_mp3_128';
    } else if (streamsData.hls_mp3_128_url) {
      streamUrl = streamsData.hls_mp3_128_url;
      streamFormat = 'hls_mp3_128';
    } else {
      // If none of the preferred formats are available, use the first available format
      const formats = Object.keys(streamsData).filter((key) =>
        key.endsWith('_url')
      );
      if (formats.length > 0) {
        const format = formats[0];
        streamUrl = streamsData[format];
        streamFormat = format.replace('_url', '');
      }
    }

    if (!streamUrl) {
      console.error('No stream URL available for this track');

      // Try the traditional method with stream_url as a fallback
      if (trackData.stream_url) {
        console.log('Falling back to stream_url method');
        streamUrl = `${trackData.stream_url}?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`;
        streamFormat = 'stream_url';
      } else {
        // If no stream URL is available, return an error with the widget URL
        return NextResponse.json(
          {
            error: 'No stream URL available for this track',
            widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
            title: trackData.title,
            artwork_url: trackData.artwork_url,
          },
          { status: 200 } // Return 200 with widget URL so player can fall back
        );
      }
    }

    console.log(
      `Using ${streamFormat} format: ${streamUrl.substring(0, 50)}...`
    );

    // Create a widget URL as a fallback option
    const widgetUrl = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

    return NextResponse.json({
      streamUrl,
      streamFormat,
      availableFormats: Object.keys(streamsData).filter((key) =>
        key.endsWith('_url')
      ),
      widgetUrl,
      trackId,
      title: trackData.title,
      duration: trackData.duration,
      artwork_url: trackData.artwork_url,
    });
  } catch (error) {
    console.error('Error fetching Soundcloud stream:', error);

    // Try to use cached data if available when encountering an error
    if (trackCache[trackId]) {
      console.warn('Using cached data due to error');
      const cachedData = trackCache[trackId];

      if (cachedData.streams) {
        // [Simplified for brevity - would repeat the cached stream logic]
        return NextResponse.json({
          error: 'Error occurred, using cached data',
          widgetUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`,
          title: cachedData.data?.title || 'Unknown Track',
          artwork_url: cachedData.data?.artwork_url || '',
          cached: true,
        });
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch Soundcloud stream',
        details: error instanceof Error ? error.message : String(error),
        // Include widget URL even on error
        widgetUrl: trackId
          ? `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`
          : '',
      },
      { status: 500 }
    );
  }
}
