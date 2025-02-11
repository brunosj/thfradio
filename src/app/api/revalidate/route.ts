import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (token !== `Bearer ${process.env.REVALIDATE_TOKEN}`) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { model, entry } = body;

    // Revalidate based on content type
    switch (model) {
      case 'homepage':
        revalidatePath('/', 'page');
        break;
      case 'page':
        if (entry?.slug) {
          revalidatePath(`/${entry.slug}`, 'page');
          // Special handling for specific pages
          switch (entry.slug) {
            case 'news':
              revalidatePath('/news', 'page');
              break;
            case 'shows':
              revalidatePath('/shows', 'page');
              break;
            case 'about':
              revalidatePath('/about', 'page');
              break;
          }
        }
        break;
      case 'about':
        revalidatePath('/about', 'page');
        break;
      case 'info':
        revalidatePath('/info', 'page');
        break;
      case 'show':
        // Revalidate shows listing page
        revalidatePath('/shows', 'page');
        // Revalidate the specific show page if we have a slug
        if (entry?.slug) {
          revalidatePath(`/shows/${entry.slug}`, 'page');
        }
        break;
      case 'news':
        // Revalidate news listing page
        revalidatePath('/news', 'page');
        // Revalidate the specific news article page if we have a slug
        if (entry?.slug) {
          revalidatePath(`/news/${entry.slug}`, 'page');
        }
        break;
      default:
        // Log unhandled content types
        console.log(`Unhandled content type: ${model}`);
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error('Error revalidating:', err);
    return NextResponse.json(
      { message: 'Error revalidating' },
      { status: 500 }
    );
  }
}
