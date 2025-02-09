'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Define menu keys as const arrays for type safety
const menuKeys = ['news', 'shows', 'programme', 'latest', 'info'] as const;
const followMenuKeys = [
  'Instagram',
  'Facebook',
  'Mixcloud',
  'Soundcloud',
] as const;
const extraMenuKeys = ['privacy', 'imprint'] as const;
const contactMenuKeys = ['support'] as const;

const Footer = () => {
  const t = useTranslations();

  return (
    <footer className='bg-thf-blue-500 py-6 lg:py-12 layout'>
      <nav className='text-white grid grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-24 '>
        <div className='col-span-2 space-y-6'>
          <h4 className='font-mono'>THF RADIO</h4>
          <p className='text-sm lg:text-base'>{t('footerDescription')}</p>
        </div>
        <div>
          <h4 className='uppercase text-orange-500 pb-6'>{t('menuTitle')}</h4>
          {menuKeys.map((key) => {
            const isExternal = t(`menu.${key}.path`).slice(0, 4) === 'http';
            return (
              <Link
                href={t(`menu.${key}.path`)}
                rel={isExternal ? 'noopener noreferrer' : ''}
                target={isExternal ? '_blank' : ''}
                key={key}
              >
                <p className='py-1 textHover text-sm lg:text-base'>
                  {t(`menu.${key}.name`)}
                </p>
              </Link>
            );
          })}
        </div>
        <div>
          <h4 className='uppercase text-orange-500 pb-6'>Follow</h4>
          {followMenuKeys.map((key) => {
            const menuItem = t
              .raw('followMenu')
              .find((item: { name: string }) => item.name === key);
            if (!menuItem) return null;

            return (
              <Link
                href={menuItem.path}
                rel='noopener noreferrer'
                target='_blank'
                key={key}
              >
                <p className='py-1 textHover text-sm lg:text-base'>
                  {menuItem.name}
                </p>
              </Link>
            );
          })}
        </div>
        <div>
          <h4 className='uppercase text-orange-500 pb-6'>
            {t('contactTitle')}
          </h4>
          {contactMenuKeys.map((key) => {
            const menuItem = t
              .raw('contactMenu')
              .find((item: { name: string }) =>
                item.name.toLowerCase().includes(key)
              );
            if (!menuItem) return null;

            return (
              <Link
                href={menuItem.path}
                rel='noopener noreferrer'
                target='_blank'
                key={key}
              >
                <p className='py-1 textHover text-sm lg:text-base'>
                  {menuItem.name}
                </p>
              </Link>
            );
          })}
        </div>
        <div>
          <h4 className='uppercase text-orange-500 pb-6'>Legal</h4>
          {extraMenuKeys.map((key) => {
            const menuItem = t
              .raw('extraMenu')
              .find((item: { path: string; name: string }) =>
                item.path.includes(key)
              );
            if (!menuItem) return null;

            return (
              <Link href={menuItem.path} key={key}>
                <p className='py-1 textHover text-sm lg:text-base'>
                  {menuItem.name}
                </p>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* <div className='ml-auto text-right text-white text-sm'>
        <p>
          Built by{' '}
          <Link
            href='https://www.landozone.net/'
            target='_blank'
            className='textHover text-neutral-300 hover:text-neutral-500'
          >
            landozone
          </Link>
        </p>
        <p>
          Check out the code on{' '}
          <Link
            href='https://github.com/brunosj/thfradio-nextjs/'
            target='_blank'
            className='textHover text-neutral-300 hover:text-neutral-500'
          >
            Github
          </Link>
        </p>
      </div> */}
    </footer>
  );
};

export default Footer;
