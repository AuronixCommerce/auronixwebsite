import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://auronix.com'),
  title: {
    default: 'Auronix Commerce LLC | Modern E-Commerce & Marketplace Operations',
    template: '%s | Auronix Commerce LLC',
  },
  description:
    'Auronix Commerce LLC connects quality suppliers, brands, and online marketplaces through smarter procurement, distribution, and e-commerce operations.',
  keywords: [
    'e-commerce',
    'marketplace operations',
    'procurement',
    'distribution',
    'supplier partnerships',
    'commerce technology',
    'Auronix',
  ],
  authors: [{ name: 'Auronix Commerce LLC' }],
  creator: 'Auronix Commerce LLC',
  publisher: 'Auronix Commerce LLC',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://auronix.com',
    siteName: 'Auronix Commerce LLC',
    title: 'Auronix Commerce LLC | Modern E-Commerce & Marketplace Operations',
    description:
      'Auronix Commerce LLC connects quality suppliers, brands, and online marketplaces through smarter procurement, distribution, and e-commerce operations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auronix Commerce LLC | Modern E-Commerce & Marketplace Operations',
    description:
      'Auronix Commerce LLC connects quality suppliers, brands, and online marketplaces through smarter procurement, distribution, and e-commerce operations.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
