import React from 'react';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import type { NewsType } from '@/types/ResponsesInterface';
import Image from 'next/image';
import { CMS_URL } from '@/utils/constants';
import { Link } from '@/i18n/routing';
import { formatDate } from '@/utils/formatDate';

type PropType = {
  slides: NewsType[];
  options?: CarouselProps;
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

const NewsCarousel: React.FC<PropType> = (props) => {
  const options: CarouselProps = {
    // Update type of 'options' to CarouselProps
    opts: {
      slidesToScroll: 'auto',
      containScroll: 'keepSnaps',
    },
  };
  const { slides } = props;
  const [emblaRef] = useEmblaCarousel(options?.opts);

  return (
    <div className='news__embla'>
      <div className='embla__viewport' ref={emblaRef}>
        <div className='embla__container'>
          {slides.slice(0, 6).map((item, index) => {
            const formattedDate = formatDate(item.attributes.date);
            return (
              <div className='embla__slide' key={index}>
                <div className=' text-white rounded-xl  w-full h-full group'>
                  <Link href={`/news/#${item.attributes.slug}`}>
                    <div className='relative w-full h-48 lg:h-72 imageHover pb-6'>
                      <Image
                        quality={50}
                        src={`${CMS_URL}${item.attributes.picture.data.attributes.url}`}
                        fill
                        sizes=''
                        className='object-contain object-center rounded-t-xl p-4'
                        alt={item.attributes.picture.data.attributes.name}
                      />
                    </div>
                    <div className='relative pt-6 bg-thf-blue-500'>
                      <div className='absolute top-0 left-0 h-8 w-1/3 lg:w-1/4 bg-orange-500 text-white text-sm flex justify-center rounded-br-xl items-center'>
                        <p>{formattedDate}</p>
                      </div>
                      <div className='space-y-6 p-6 textHover'>
                        <h2>{item.attributes.title}</h2>
                        <div className='markdown'>
                          {item.attributes.summary}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewsCarousel;
