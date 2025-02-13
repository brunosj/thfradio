import { NextResponse } from 'next/server';

async function getToken() {
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
    throw new Error(`Token request failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET() {
  try {
    // First get the token
    const token = await getToken();

    console.log('Got token:', token.slice(0, 10) + '...');

    // Then use it to resolve the user
    const url = `https://api.soundcloud.com/resolve?url=https://soundcloud.com/thfradio`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Soundcloud API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        clientIdExists: !!process.env.SOUNDCLOUD_CLIENT_ID,
        clientSecretExists: !!process.env.SOUNDCLOUD_CLIENT_SECRET,
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch user ID',
          details: {
            status: response.status,
            statusText: response.statusText,
            errorText,
          },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user ID',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
