'use client';

// Homepage merch row: swipe through the items, the last tile leads to the
// SumUp store. Items come from src/app/_lib/merch.ts; with none listed the
// row is just the shop tile (in local development: placeholder tiles, so the
// layout can be reviewed).
import { useTranslations } from 'next-intl';
import { FiArrowUpRight } from 'react-icons/fi';
import { MERCH_ITEMS, MERCH_SHOP_URL, type MerchItem } from '@/lib/merch';

const DEV_PLACEHOLDERS: MerchItem[] =
  process.env.NODE_ENV === 'development' && MERCH_ITEMS.length === 0
    ? Array.from({ length: 5 }, (_, i) => ({ title: `Merch ${i + 1}`, image: '' }))
    : [];

const tileWidth = 'w-[62%] sm:w-[38%] md:w-[30%] lg:w-[calc((100%-4rem)/5)]';

function MerchTile({ item }: { item: MerchItem }) {
  const t = useTranslations();
  return (
    <a
      href={item.href || MERCH_SHOP_URL}
      target='_blank'
      rel='noopener noreferrer'
      className='group flex h-full flex-col border border-white/30 p-2 sm:p-2.5 lg:p-3 text-white transition-colors duration-300 hover:border-white'
    >
      <div className='relative aspect-square overflow-hidden bg-thf-blue-900'>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            loading='lazy'
            className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]'
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-thf-blue-500 to-thf-blue-900'>
            <span className='font-mono text-xs uppercase tracking-wider text-white/70'>{item.title}</span>
          </div>
        )}
      </div>
      <div className='flex items-start justify-between gap-2 pt-3 lg:pt-4 px-0.5'>
        <span className='font-mono uppercase text-[13px] lg:text-[15px] leading-snug tracking-wide line-clamp-2'>{item.title}</span>
        <FiArrowUpRight className='mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100' aria-hidden />
      </div>
      <span className='mt-1 px-0.5 font-mono text-[11px] uppercase tracking-wide text-white/60'>{t('merchToShop')}</span>
    </a>
  );
}

export default function MerchSection() {
  const t = useTranslations();
  const items = MERCH_ITEMS.length ? MERCH_ITEMS : DEV_PLACEHOLDERS;

  return (
    <section className='bg-dark-blue text-white pt-12 lg:pt-16 pb-10 lg:pb-14' id='merch'>
      <div className='layout mb-4 lg:mb-6 flex items-end justify-between gap-6'>
        {/* div, not h2: the global h2 style would win over these classes */}
        <div role='heading' aria-level={2} className='font-sans font-bold text-2xl lg:text-3xl leading-none'>
          {t('merchTitle')}
        </div>
        <a
          href={MERCH_SHOP_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/70 hover:text-white'
        >
          {t('merchToShop')}
          <FiArrowUpRight className='h-3.5 w-3.5' aria-hidden />
        </a>
      </div>

      <ul
        role='list'
        className='flex gap-3 lg:gap-4 overflow-x-auto snap-x snap-mandatory px-6 lg:px-16 scroll-px-6 lg:scroll-px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className={`snap-start shrink-0 ${tileWidth}`}>
            <MerchTile item={item} />
          </li>
        ))}
        {/* Last tile: the whole shop */}
        <li className={`snap-start shrink-0 ${tileWidth}`}>
          <a
            href={MERCH_SHOP_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='group flex h-full min-h-48 flex-col justify-between bg-white p-4 lg:p-5 text-dark-blue transition-colors duration-300 hover:bg-orange-500 hover:text-white'
          >
            <span className='font-sans font-bold uppercase text-xl lg:text-2xl leading-tight'>{t('merchAll')}</span>
            <span className='flex items-center justify-between font-mono text-xs uppercase tracking-wider'>
              thf-radio.sumupstore.com
              <FiArrowUpRight className='h-6 w-6 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1' aria-hidden />
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
