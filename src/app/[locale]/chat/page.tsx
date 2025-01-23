import { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import ChatRoom from '@/modules/chat/ChatRoom';

async function getChatPageData(locale: string = 'en') {
  const pagesResponse = await fetch(
    `${process.env.STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`,
    { next: { revalidate: 10 } }
  );
  const pages = await pagesResponse.json();
  const [page] = pages.data.filter(
    (page: PageTypes) => page.attributes.slug === 'chat'
  );
  return page;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getChatPageData();
  return createMetadata({
    title: page.attributes.title,
    description: page.attributes.description,
  });
}

export default async function ChatPage() {
  const page = await getChatPageData();

  return (
    <>
      <div className='bg-dark-blue relative pt-6 lg:pt-10'>
        <div className='layout sectionPy'>
          <h1 className='text-white'>{page.attributes.title}</h1>
          <div className='text-white mt-4'>{page.attributes.description}</div>
        </div>
      </div>
      <div className='layout py-8 lg:py-16'>
        <div
          className='prose prose-lg mb-8'
          dangerouslySetInnerHTML={{ __html: page.attributes.content }}
        />
        <ChatRoom />
      </div>
    </>
  );
}
