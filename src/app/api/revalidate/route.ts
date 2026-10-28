import { revalidatePath, revalidateTag } from 'next/cache';
import { SHOWS_CACHE_TAG } from '@/lib/shows';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.REVALIDATE_TOKEN;
    const token = request.headers.get('authorization');
    if (!expected || token !== `Bearer ${expected}`) {
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
        // Sent by thfradio.space when a host saves show info. Drop the cached
        // show data, then rebuild the list and show pages in every language
        // (real routes live under /[locale]/...).
        revalidateTag(SHOWS_CACHE_TAG);
        revalidatePath('/[locale]/shows', 'page');
        revalidatePath('/[locale]/shows/[slug]', 'page');
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
        break;
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
