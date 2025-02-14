import { ReactNode, ElementType, Ref } from 'react';
import type { StaticImageData } from 'next/image';
export interface Props {
  children?: ReactNode;
  className?: string;
}

export interface MediaProps {
  alt?: string;
  className?: string;
  fill?: boolean;
  htmlElement?: ElementType | null;
  imgClassName?: string;
  onClick?: () => void;
  onLoad?: () => void;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  ref?: Ref<HTMLImageElement | HTMLVideoElement | null>;
  resource?: string | number;
  size?: string;
  src?: string | StaticImageData;
  width?: number;
  height?: number;
  videoClassName?: string;
}
