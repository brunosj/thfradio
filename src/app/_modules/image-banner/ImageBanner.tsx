import Image from 'next/image';
import { CMS_URL } from '@/utils/constants';
interface Props {
  src: string;
  alt: string;
}
const ImageBanner = ({ src, alt }: Props) => {
  const resolvedSrc =
    src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `${CMS_URL}${src.startsWith("/") ? "" : "/"}${src}`;

  return (
    <div className='relative h-[70vh] w-full'>
      <Image
        quality={50}
        src={resolvedSrc}
        alt={alt}
        fill
        className='object-cover object-center'
      />
    </div>
  );
};

export default ImageBanner;
