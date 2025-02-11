import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';

export const useSmoothScroll = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useParams();

  const handleAnchorLinkClick = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault();

    // Remove the locale prefix from pathname for comparison
    const pathWithoutLocale = pathname.replace(`/${locale}/`, '/');

    if (href.startsWith('#') && pathWithoutLocale === '/') {
      const element = document.getElementById(href.slice(1));
      if (element) {
        const elementPositionY = element.getBoundingClientRect().top;
        window.scrollTo({
          top: elementPositionY + window.scrollY - 110,
          behavior: 'smooth',
        });
      }
    } else {
      // Add locale to the href if it's an internal link
      const localizedHref = href.startsWith('/') ? `/${locale}${href}` : href;
      router.push(localizedHref);
    }
  };

  return handleAnchorLinkClick;
};
