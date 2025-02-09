import { Metadata } from 'next';
import ChatContent from './page.client';
import { setRequestLocale } from 'next-intl/server';

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  params: Params;
  searchParams: SearchParams;
};

export const metadata: Metadata = {
  title: 'THF Radio Chat',
  description: 'Join the THF Radio community chat on Discord',
};

export default async function ChatPage(props: Props) {
  const params = await props.params;
  setRequestLocale(params.locale);

  return <ChatContent />;
}
