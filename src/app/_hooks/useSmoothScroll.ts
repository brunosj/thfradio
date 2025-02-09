import { useRouter, usePathname } from 'next/navigation';

export const useSmoothScroll = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleAnchorLinkClick = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault();

    if (href.startsWith('/#') && pathname === '/') {
      const element = document.getElementById(href.slice(2));

      if (element) {
        const elementPositionY = element.getBoundingClientRect().top;
        window.scrollTo({
          top: elementPositionY + window.scrollY - 110,
          behavior: 'smooth',
        });
      }
    } else {
      router.push(href);
    }
  };

  return handleAnchorLinkClick;
};
