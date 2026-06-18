'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useTransition } from 'react';

interface LanguageSwitcherProps {
  isMobile?: boolean;
  onMobileClick?: () => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  isMobile = false,
  onMobileClick,
}) => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale, scroll: false });
      if (onMobileClick) onMobileClick();
    });
  };

  if (isMobile) {
    return (
      <button
        onClick={() => handleLocaleChange(locale === 'en' ? 'de' : 'en')}
        className='block text-xl textHover'
        disabled={isPending}
      >
        <p className='px-4 py-6'>
          <span
            className={locale === 'en' ? 'underline underline-offset-4' : ''}
          >
            EN
          </span>{' '}
          /{' '}
          <span
            className={locale === 'de' ? 'underline underline-offset-4' : ''}
          >
            DE
          </span>
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={() => handleLocaleChange(locale === 'en' ? 'de' : 'en')}
      className='border-t border-l border-r border-white rounded-tr-xl hover:bg-white hover:text-thf-blue-500 duration-300 hover:cursor-pointer'
      aria-label='change language'
      disabled={isPending}
    >
      <p className='py-3 px-6'>
        <span className={locale === 'en' ? 'underline underline-offset-4' : ''}>
          EN
        </span>{' '}
        /{' '}
        <span className={locale === 'de' ? 'underline underline-offset-4' : ''}>
          DE
        </span>
      </p>
    </button>
  );
};

export default LanguageSwitcher;
