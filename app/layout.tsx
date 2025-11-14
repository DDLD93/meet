import './globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Vini Meet | Vinicius International Video Conference',
    template: '%s | Vini Meet',
  },
  description:
    'Vini Meet - Vinicius International Video Conference. Professional video conferencing solution for seamless remote collaboration.',
  twitter: {
    card: 'summary_large_image',
  },
  openGraph: {
    url: 'https://vini.meet',
    siteName: 'Vini Meet',
    type: 'website',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
