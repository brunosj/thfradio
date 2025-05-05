import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import AutoHeight from 'embla-carousel-auto-height';
import { DotButtonText } from './CarouselNavigation';
import type { TextSlide } from '@/types/ResponsesInterface';
import ReactMarkdown from 'react-markdown';

type PropType = {
  slides: TextSlide[];
};

type CarouselApi = UseEmblaCarouselType[1];

//
const TextCarousel: React.FC<PropType> = (props) => {
  const { slides } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false }, [
    AutoHeight(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
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

  return (
    <>
      <div className='embla'>
        <div className='embla__viewport' ref={emblaRef}>
          <div className='embla__container embla__adjustHeight'>
            {slides.map((slide, index) => (
              <div className='embla__slide' key={index}>
                <div className='layout  w-full lg:w-2/3 m-auto  markdown pb-6'>
                  <h1 className='text-thf-blue-500 uppercase tracking-wider font-semibold'>
                    {slide.heading}
                  </h1>
                  <ReactMarkdown>{slide.text}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='textEmbla__dots'>
          {scrollSnaps.length > 1 &&
            scrollSnaps.map((_, index) => (
              <DotButtonText
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

export default TextCarousel;
