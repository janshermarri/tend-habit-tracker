import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', weight: ['400', '500', '600'] });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Tend',
  description: 'A calm habit and goal tracker',
  manifest: '/manifest.webmanifest',
  // Standalone mode + a home-screen icon; iOS reads apple-touch-icon, not the manifest.
  appleWebApp: { capable: true, title: 'Tend', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Tend',
    description: 'A calm habit and goal tracker',
    images: ['/tend-social-1200x630.png'],
    type: 'website',
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F1EC' },
    { media: '(prefers-color-scheme: dark)', color: '#141614' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Set data-theme="dark" on <html> for dark mode (e.g. from a user setting or prefers-color-scheme).
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
