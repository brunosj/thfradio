import TextCarousel from '../carousel/TextCarousel';
import type { TextSlide } from '@/types/ResponsesInterface';

type Props = {
  textSlides: TextSlide[];
};

const CodeOfConductSection = ({ textSlides }: Props) => {
  return (
    <section className='sectionPy bg-orange-500'>
      <div className='text-white text-center'>
        <TextCarousel slides={textSlides} />
      </div>
    </section>
  );
};

export default CodeOfConductSection;
