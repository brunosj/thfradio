import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
// import { routing } from '@/i18n/routing';
import ClientLayout from './ClientLayout';
import { DataProviderWrapper } from '@/app/_context/DataProviderWrapper';
import LiveTicker from '@/modules/live-ticker/LiveTicker';
import MixcloudWidget from '@/modules/mixcloud/MixcloudWidget';
import JoinChat from '@/modules/chat/JoinChat';
import Footer from '@/app/_common/layout/footer/Footer';
import '@/styles/global.css';
import '@/styles/carousel.css';

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  children: React.ReactNode;
  params: Params;
  searchParams: SearchParams;
};

export const metadata: Metadata = {
  title: 'Your Site Title',
  description: 'Your site description',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Your Site Title',
    description: 'Your site description',
    url: 'your-site-url',
    images: ['your-default-image'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Site Title',
    description: 'Your site description',
    images: ['your-default-image'],
  },
};

// export function generateStaticParams() {
//   return routing.locales.map((locale) => ({ locale }));
// }

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // Enable static rendering
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <DataProviderWrapper locale={locale}>
        <LiveTicker />
        <ClientLayout>
          <article>{children}</article>
        </ClientLayout>
        <Footer />
        <MixcloudWidget />
        <JoinChat />
      </DataProviderWrapper>
    </NextIntlClientProvider>
  );
}
