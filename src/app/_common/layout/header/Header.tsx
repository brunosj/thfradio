'use client';

import { useState, useRef, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import logo from '@/assets/logo_white.png';
import AudioPlayer from '@/modules/live-radio/AudioPlayer';

import { Bars3Icon } from '@/common/assets/Bars3Icon';
import { XMarkIcon } from '@/common/assets/XMarkIcon';
import JoinChatMobile from '@/modules/chat/JoinChatMobile';
import LanguageSwitcher from '@/app/_common/layout/header/LanguageSwitcher';

interface HeaderProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const menuKeys = ['news', 'shows', 'programme', 'latest', 'info'] as const;

const Header: React.FC<HeaderProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Anchor links smooth behaviour
  const handleAnchorLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = anchorRefs.current[targetId];
      targetElement?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(href);
    }
  };

  // Mobile menu events
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const [menuWidth, setMenuWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (menuRef.current) {
        setMenuWidth(menuRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [menuWidth]);

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className='sticky w-full z-50 top-0 pt-4  bg-thf-blue-500 text-white pb-4 lg:pb-0 opacity-100 h-16'>
      <div className={`layout flex items-center justify-between `}>
        <Link className='w-24 lg:w-32 pb-2 lg:pb-4' href='/' aria-label='logo'>
          <Image quality={50} src={logo} alt='THF Radio Logo' />
        </Link>
        <div className=''>
          {/* Desktop Menu */}
          <nav className='hidden lg:flex items-center border-t'>
            {menuKeys.map((key) => {
              const isExternal = t(`menu.${key}.path`).slice(0, 4) === 'http';
              return (
                <Link
                  key={key}
                  href={t(`menu.${key}.path`)}
                  onClick={(e) =>
                    handleAnchorLinkClick(e, t(`menu.${key}.path`))
                  }
                  rel={isExternal ? 'noopener noreferrer' : ''}
                  target={isExternal ? '_blank' : ''}
                  className={`border-l hover:bg-white hover:text-neutral-900 duration-300 ${
                    pathname === t(`menu.${key}.path`)
                      ? 'bg-white text-neutral-900'
                      : 'textHover'
                  }`}
                >
                  <p className='py-3 px-6'>{t(`menu.${key}.name`)}</p>
                </Link>
              );
            })}
            <LanguageSwitcher />
          </nav>
          {/* Mobile Menu */}
          <nav className={'block lg:hidden '}>
            <div className='flex space-x-3'>
              <AudioPlayer
                iconFill='white'
                iconClassName='w-6 h-6'
                audioSrc={
                  process.env.LIVE_RADIO_STREAM ||
                  'https://thfradio2.out.airtime.pro/thfradio2_a'
                }
              />
              <button
                onClick={handleToggleMenu}
                className='text-white'
                aria-label='Menu'
              >
                {isOpen ? <XMarkIcon /> : <Bars3Icon />}{' '}
              </button>
            </div>
            <LanguageSwitcher isMobile onMobileClick={() => setIsOpen(false)} />
          </nav>
        </div>
      </div>
      <div
        ref={menuRef}
        className={`fixed top-12 right-0 h-full bg-thf-blue-500 text-white w-4/5 overflow-auto  transform  duration-700 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : `translate-x-full`
        } transition-transform`}
      >
        <div className='flex flex-col items-center justify-center h-full space-y-3'>
          {menuKeys.map((key) => {
            const isExternal = t(`menu.${key}.path`).slice(0, 4) === 'http';

            return (
              <Link
                key={key}
                href={t(`menu.${key}.path`)}
                rel={isExternal ? 'noopener noreferrer' : ''}
                target={isExternal ? '_blank' : ''}
                className='block px-4 py-2 text-xl textHover '
                onClick={() => setIsOpen(false)}
              >
                {t(`menu.${key}.name`)}
              </Link>
            );
          })}
          <JoinChatMobile />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

export default Header;
