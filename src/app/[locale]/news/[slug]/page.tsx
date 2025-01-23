import { Metadata } from 'next';
import Image from 'next/image';
import { createMetadata } from '@/utils/metadata';
import { CMS_URL } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';

async function getNewsArticle(slug: string) {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news?locale=all&populate=*`,
    { next: { revalidate: 10 } }
  );
  const initial = await res.json();
  const currentLocaleEntry = initial.data.find(
    (entry: NewsTypes) =>
      entry.attributes.slug === slug && entry.attributes.locale === 'en'
  );
  return currentLocaleEntry;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getNewsArticle(params.slug);
  const image = article.attributes.picture?.data?.attributes.url || '';

  return generateMetadata({
    title: article.attributes.title,
    description: article.attributes.description,
    image: `${CMS_URL}${image}`,
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getNewsArticle(params.slug);

  return (
    <article className='min-h-screen'>
      {article.attributes.picture?.data && (
        <div className='relative h-[50vh] w-full'>
          <Image
            src={`${CMS_URL}${article.attributes.picture.data.attributes.url}`}
            alt={article.attributes.title}
            fill
            className='object-cover'
          />
        </div>
      )}
      <div className='layout py-8 lg:py-16'>
        <h1>{article.attributes.title}</h1>
        <time className='text-sm text-gray-500 block mt-2'>
          {formatDate(article.attributes.date)}
        </time>
        <div
          className='prose prose-lg mt-8'
          dangerouslySetInnerHTML={{ __html: article.attributes.content }}
        />
      </div>
    </article>
  );
}

export async function generateStaticParams() {
  const res = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}news?locale=all&populate=localizations`
  );
  const items = await res.json();

  return items.data.map((item: NewsTypes) => ({
    slug: item.attributes.slug,
  }));
}
