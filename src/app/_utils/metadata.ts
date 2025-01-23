import { Metadata } from 'next';
import { siteMetadata } from './siteMetadata';

export function createMetadata({
  title,
  description,
  image,
}: {
  title?: string;
  description?: string;
  image?: string;
}): Metadata {
  return {
    title: title ? `${title} | ${siteMetadata.title}` : siteMetadata.title,
    description: description || siteMetadata.description,
    openGraph: {
      title: title || siteMetadata.title,
      description: description || siteMetadata.description,
      url: siteMetadata.siteUrl,
      images: [image || siteMetadata.image],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title || siteMetadata.title,
      description: description || siteMetadata.description,
      images: [image || siteMetadata.image],
    },
  };
}
