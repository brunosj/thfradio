'use client';

// Compact footer: name + one line about THF Radio on the left, four small
// link columns (menu, follow, contact, legal) on the right.
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Define menu keys as const arrays for type safety
const menuKeys = ['news', 'programme', 'latest', 'shop', 'info'] as const;
const followMenuKeys = ['Instagram', 'Facebook', 'Mixcloud', 'Soundcloud'] as const;
const extraMenuKeys = ['privacy', 'imprint', 'awareness'] as const;

type Item = { name: string; path: string };

function Column({ title, items }: { title: string; items: (Item | undefined)[] }) {
  const list = items.filter((i): i is Item => !!i);
  if (!list.length) return null;
  return (
    <div>
      {/* p, not h4: the global h4 style would win over these classes */}
      <p className='mb-2.5 font-mono text-[11px] uppercase tracking-wider text-white/55'>{title}</p>
      <ul className='space-y-1'>
        {list.map((item) => {
          const external = /^(https?:|mailto:)/.test(item.path);
          return (
            <li key={item.path}>
              <Link
                href={item.path}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className='text-sm text-white/90 transition-colors hover:text-white hover:underline underline-offset-4'
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const Footer = () => {
  const t = useTranslations();
  const follow = t.raw('followMenu') as Item[];
  const contact = t.raw('contactMenu') as Item[];
  const extra = t.raw('extraMenu') as Item[];

  return (
    <footer className='bg-thf-blue-500 text-white'>
      <nav className='layout grid grid-cols-2 gap-x-6 gap-y-8 py-8 lg:py-10 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] md:gap-x-10'>
        <div className='col-span-2 md:col-span-1 max-w-xs'>
          <p className='font-mono text-sm uppercase tracking-wider'>THF Radio</p>
          <p className='mt-2 text-xs lg:text-sm leading-relaxed text-white/75'>{t('footerDescription')}</p>
        </div>
        <Column
          title={t('menuTitle')}
          items={menuKeys.map((key) => ({ name: t(`menu.${key}.name`), path: t(`menu.${key}.path`) }))}
        />
        <Column title='Follow' items={followMenuKeys.map((key) => follow.find((i) => i.name === key))} />
        {/* All contact entries (the German one isn't called "support") */}
        <Column title={t('contactTitle')} items={contact} />
        <Column title='Legal' items={extraMenuKeys.map((key) => extra.find((i) => i.path.includes(key)))} />
      </nav>
    </footer>
  );
};

export default Footer;
