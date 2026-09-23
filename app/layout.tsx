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

/**
 * Applies the theme before first paint.
 *
 * Runs blocking in <head>: doing this in an effect would show a flash of the
 * wrong theme on every load. Reads the saved override, else follows the OS.
 */
const themeScript = `
(function(){try{
  var s=localStorage.getItem('tend-theme');
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme=(s==='light'||s==='dark')?s:(d?'dark':'light');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script rewrites data-theme before React hydrates.
    <html lang="en" data-theme="light" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
