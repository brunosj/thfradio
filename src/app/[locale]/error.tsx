'use client';

import { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { reportClientError } from '@/lib/reportError';

// Same look as the white-orange UIButton (which only works as a link)
const BUTTON =
  'flex font-mono rounded-xl text-sm shadow-sm border border-dark-blue px-4 py-2 cursor-pointer bg-white duration-300 hover:bg-orange-500 hover:text-white';

// Shown instead of a page that crashed. Header, programme and player stay, so the radio keeps playing.
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errorPage');
  const router = useRouter();

  useEffect(() => {
    // With a digest the error happened on the server and src/instrumentation.ts already reported it
    // (in the browser it only reads "An error occurred in the Server Components render").
    if (!error.digest) reportClientError(error, { route: '[locale]/error.tsx' });
  }, [error]);

  // Load the page's server data again too, not just re-render it
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className='bg-dark-blue min-h-screen flex items-center justify-center' data-area='error-page'>
      <div className='layout text-center'>
        <h1 className='text-3xl lg:text-5xl font-bold mb-4 text-white'>{t('title')}</h1>
        <p className='text-white mb-8'>{t('description')}</p>
        <div className='flex flex-wrap justify-center gap-3'>
          <button type='button' className={BUTTON} onClick={retry}>
            {t('retry')}
          </button>
          <Link href='/' className={BUTTON}>
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
