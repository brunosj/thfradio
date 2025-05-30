import React, { useCallback, useEffect, useState, useRef } from 'react';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { DotButton } from './CarouselNavigation';
import type { Pictures } from '@/types/ResponsesInterface';
import { CMS_URL } from '@/utils/constants';
import { ImageMedia } from '@/lib/image';

type PropType = {
  options?: CarouselProps;
  slides: Pictures;
};

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

const ImageCarousel: React.FC<PropType> = (props) => {
  const { slides, options } = props;
  const autoplay = useRef(
    Autoplay(
      { delay: 3000, stopOnInteraction: false }
      // (emblaRoot) => emblaRoot.parentElement
    )
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(options?.opts, [
    autoplay.current,
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) {
        emblaApi.scrollTo(index);
        autoplay.current.reset();
      }
    },
    [emblaApi]
  );

  const onInit = useCallback((emblaApi: CarouselApi) => {
    if (emblaApi) {
      setScrollSnaps(emblaApi.scrollSnapList());
    }
  }, []);

  const onSelect = useCallback((emblaApi: CarouselApi) => {
    if (emblaApi) {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  const imageByIndex = (pictures: Pictures, index: number): string => {
    if (pictures.data.length === 0) {
      return ''; // or throw an error, depending on your needs
    }
    return `${CMS_URL}${
      pictures.data[index % pictures.data.length].attributes.url
    }`;
  };

  return (
    <>
      <div className='embla'>
        <div className='embla__viewport' ref={emblaRef}>
          <div className='embla__container'>
            {slides.data.map((slide, index) => (
              <div className='embla__slide' key={index}>
                <div className='relative h-[30rem] w-full overflow-hidden lg:rounded-lg'>
                  <ImageMedia
                    imgClassName='object-cover'
                    src={imageByIndex(slides, index)}
                    alt='Your alt text'
                    fill
                    priority={index === 0}
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                  {/* Dark overlay for mobile devices */}
                  <div className='absolute inset-0 bg-black/20 '></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='embla__dots'>
          {scrollSnaps.length > 1 &&
            scrollSnaps.map((_, index) => (
              <DotButton
                key={index}
                selected={index === selectedIndex}
                onClick={() => scrollTo(index)}
              />
            ))}
        </div>
      </div>
    </>
  );
};

export default ImageCarousel;
