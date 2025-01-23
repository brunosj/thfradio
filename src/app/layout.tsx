import localFont from 'next/font/local';

import '@/styles/global.css';
import '@/styles/carousel.css';

const NeueMachina = localFont({
  src: [
    {
      path: '../app/_styles/fonts/NeueMachina-Regular.ttf',
      weight: '400',
      style: 'normal',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${SpaceMono.variable} ${NeueMachina.variable}`}>
      <body>{children}</body>
    </html>
  );
}
