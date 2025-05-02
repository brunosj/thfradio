import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
// import { routing } from '@/i18n/routing';
import HeaderWithBlur from './HeaderWithBlur';
import LiveTicker from '@/modules/live-ticker/LiveTicker';
import JoinChat from '@/modules/chat/JoinChat';
import Footer from '@/app/_common/layout/footer/Footer';
import { siteMetadata } from '@/utils/siteMetadata';
import CloudPlayer from '@/app/_modules/player/CloudPlayer';

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  children: React.ReactNode;
  params: Params;
  searchParams: SearchParams;
};

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description,
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    images: [siteMetadata.image],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteMetadata.image],
  },
};

// export function generateStaticParams() {
//   return routing.locales.map((locale) => ({ locale }));
// }

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LiveTicker />
      <HeaderWithBlur>
        <article>{children}</article>
      </HeaderWithBlur>
      <Footer />
      <CloudPlayer />
      {/* <CustomAudioPlayer /> */}
      <JoinChat />
    </NextIntlClientProvider>
  );
}
