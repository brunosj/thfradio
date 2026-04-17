import { Metadata } from 'next';
import ChatContent from './page.client';

export const metadata: Metadata = {
  title: 'THF Radio Chat',
  description: 'Join the THF Radio live community chat',
};

export default async function ChatPage() {
  return <ChatContent />;
}
