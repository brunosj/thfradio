import ReactMarkdown from 'react-markdown';
import Button from '@/common/ui/UIButton';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import ImageCarousel from '../carousel/ImageCarousel';
import type { Pictures } from '@/types/ResponsesInterface';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';

type HeroProps = {
  description: string;
  images: Pictures;
  showButtons: boolean;
  picturePosition: 'left' | 'right';
};

const Hero = ({
  description,
  images,
  showButtons,
  picturePosition,
}: HeroProps) => {
  const t = useTranslations();
  const handleAnchorLinkClick = useSmoothScroll();

  return (
    <section className='px-0 lg:px-16 bg-dark-blue grid grid-cols-1 lg:grid-cols-2  gap-6 lg:gap-12 font-neue-machina  pb-0 lg:pb-20'>
      <div
        className={clsx(
          picturePosition === 'right' ? 'order-1' : 'order-2',
          'hidden border-2 border-white lg:flex h-full items-center rounded-xl'
        )}
      >
        <div className='lg:px-12 lg:py-16 xl:py-24 px-6 py-12 text-center text-white markdown font-semibold'>
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      </div>

      <div
        className={clsx(
          picturePosition === 'right' ? ' order-2' : 'order-1',
          'lg:border-2 border-white relative rounded-xl'
        )}
      >
        <div className='lg:hidden absolute inset-0 flex flex-col items-center justify-center px-6 py-12 text-center z-40'>
          <div className='markdown text-white'>
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
          <div className='pt-6 flex justify-center order-3 '>
            <Button
              path='/info'
              color='white-orange'
              ariaLabel={`Navigate to About page`}
            >
              {t('aboutUs')}
            </Button>
          </div>
        </div>
        <div>
          <ImageCarousel slides={images} />
        </div>
      </div>
      {showButtons && (
        <>
          <div className='hidden lg:flex justify-center order-3 pb-6 lg:pb-0'>
            <Button
              path='/info'
              color='white-orange'
              ariaLabel={`Navigate to About page`}
            >
              {t('aboutUs')}
            </Button>
          </div>
          <div className='hidden lg:flex justify-center order-4 pb-6 lg:pb-0'>
            <Button
              path='#latest'
              color='white-orange'
              ariaLabel={`Navigate to Latest shows`}
              onClick={(e) => handleAnchorLinkClick(e, '#latest')}
            >
              {t('latestShows')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

export default Hero;
