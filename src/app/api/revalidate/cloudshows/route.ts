import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (token !== `Bearer ${process.env.REVALIDATE_TOKEN}`) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Revalidate the API route that fetches shows data
    revalidatePath('/api/cloudShows');

    // Also revalidate pages that display cloud shows
    revalidatePath('/', 'page');
    revalidatePath('/latest', 'page');
    revalidatePath('/shows', 'page');

    return NextResponse.json({
      revalidated: true,
      paths: ['/api/cloudShows', '/', '/latest', '/shows'],
      now: Date.now(),
    });
  } catch (err) {
    console.error('Error revalidating cloud shows:', err);
    return NextResponse.json(
      { message: 'Error revalidating', error: String(err) },
      { status: 500 }
    );
  }
}

// Allow GET requests too for easier testing
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    // Revalidate the API route that fetches shows data
    revalidatePath('/api/cloudShows');

    // Also revalidate pages that display cloud shows
    revalidatePath('/', 'page');
    revalidatePath('/latest', 'page');
    revalidatePath('/shows', 'page');

    return NextResponse.json({
      revalidated: true,
      paths: ['/api/cloudShows', '/', '/latest', '/shows'],
      now: Date.now(),
    });
  } catch (err) {
    console.error('Error revalidating cloud shows:', err);
    return NextResponse.json(
      { message: 'Error revalidating', error: String(err) },
      { status: 500 }
    );
  }
}
