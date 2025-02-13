import localFont from 'next/font/local';
import { setRequestLocale } from 'next-intl/server';
import { DataProviderWrapper } from './_context/DataProviderWrapper';

import '@/styles/global.css';
import '@/styles/carousel.css';

type Params = Promise<{ locale: string }>;

const NeueMachina = localFont({
  src: [
    {
      path: '../app/_styles/fonts/NeueMachina-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../app/_styles/fonts/NeueMachina-Light.ttf',
      weight: '300',
      style: 'light',
    },
    {
      path: '../app/_styles/fonts/NeueMachina-Ultrabold.ttf',
      weight: '700',
      style: 'bold',
    },
  ],
  display: 'swap',
  variable: '--neue-machina',
  weight: '1 1000',
});

const SpaceMono = localFont({
  src: '../app/_styles/fonts/SpaceMono-Regular.ttf',
  display: 'swap',
  variable: '--space-mono',
  weight: '1 1000',
});

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <html
      className={`${SpaceMono.variable} ${NeueMachina.variable}`}
      lang={locale}
    >
      <body>
        <DataProviderWrapper>{children}</DataProviderWrapper>
      </body>
    </html>
  );
}
