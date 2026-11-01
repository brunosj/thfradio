'use client';

import { MdRepeat } from 'react-icons/md';
import { useTranslations } from 'next-intl';

/** Shown instead of "(r)" after a rerun's title. */
export function RerunIcon({ className = '' }: { className?: string }) {
  const t = useTranslations();
  return (
    <span className={`inline-flex shrink-0 align-middle ${className}`} title={t('rerun')}>
      <MdRepeat className='h-[1.15em] w-[1.15em]' aria-hidden />
      <span className='sr-only'>{t('rerun')}</span>
    </span>
  );
}
