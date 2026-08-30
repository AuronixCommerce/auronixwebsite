import './globals.css';
import './mobile-responsive.css';

import type {
  Metadata,
} from 'next';

import {
  headers,
} from 'next/headers';

import {
  Inter,
} from 'next/font/google';

import {
  Toaster,
} from '@/components/ui/toaster';

import {
  SiteAnnouncementPopup,
} from '@/components/site/site-announcement-popup';

import {
  PublicSiteChrome,
} from '@/components/site/public-site-chrome';

import {
  PublicRuntime,
} from '@/components/site/public-runtime';

import {
  MaintenanceShell,
} from '@/components/site/maintenance-shell';

import {
  getMaintenanceContext,
} from '@/lib/server-maintenance-context';
import { ThemeProvider } from '@/components/site/theme-provider';
import { CookieConsent } from '@/components/site/cookie-consent';
import { DEFAULT_KEYWORDS, SEO_LOGO_IMAGE, SEO_SITE_NAME, SEO_SITE_URL, SEO_SOCIAL_IMAGE } from '@/lib/seo';

const inter =
  Inter({
    subsets: [
      'latin',
    ],

    variable:
      '--font-inter',

    display:
      'swap',

    preload:
      true,
  });

export const metadata: Metadata = {
  metadataBase:
    new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
        'https://auronixcommerce.com'
    ),

  title: {
    default:
      'Auronix Commerce LLC | eCommerce, Procurement & Marketplace Operations',

    template:
      '%s | Auronix Commerce LLC',
  },

  description:
    'Auronix Commerce LLC connects quality suppliers, brands, and products through structured procurement, sourcing, distribution, and modern marketplace operations.',

  keywords: DEFAULT_KEYWORDS,

  alternates: {
    canonical:
      'https://auronixcommerce.com/',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO_SITE_URL,
    siteName: SEO_SITE_NAME,
    title: 'Auronix Commerce LLC | eCommerce, Procurement & Marketplace Operations',
    description: 'Auronix Commerce LLC connects suppliers, brands, products, procurement, distribution, and modern marketplace operations.',
    images: [{ url: SEO_SOCIAL_IMAGE, width: 1200, height: 630, alt: 'Auronix Commerce LLC' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Auronix Commerce LLC | Modern Commerce Operations',
    description: 'Supplier partnerships, product sourcing, procurement, distribution, and marketplace operations.',
    images: [SEO_SOCIAL_IMAGE],
  },

  authors: [{ name: SEO_SITE_NAME, url: SEO_SITE_URL }],
  creator: SEO_SITE_NAME,
  publisher: SEO_SITE_NAME,
  category: 'eCommerce',

  icons: {
    icon: [{ url: SEO_LOGO_IMAGE, type: 'image/jpeg' }],
    shortcut: [{ url: SEO_LOGO_IMAGE, type: 'image/jpeg' }],
    apple: [{ url: SEO_LOGO_IMAGE, type: 'image/jpeg' }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SEO_SITE_URL}/#organization`, name: SEO_SITE_NAME, url: SEO_SITE_URL, logo: { '@type': 'ImageObject', url: SEO_LOGO_IMAGE }, image: SEO_SOCIAL_IMAGE, email: 'business@auronixcommerce.com', description: 'Auronix Commerce LLC provides product sourcing, procurement, supplier partnerships, distribution, and marketplace operations.' },
    { '@type': 'WebSite', '@id': `${SEO_SITE_URL}/#website`, url: SEO_SITE_URL, name: SEO_SITE_NAME, publisher: { '@id': `${SEO_SITE_URL}/#organization` }, inLanguage: 'en-US' },
  ],
};

function strictBoolean(
  value: unknown
) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'TRUE' ||
    value === 'True'
  );
}

export default async function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const requestHeaders =
    headers();

  const pathname =
    requestHeaders.get(
      'x-auronix-pathname'
    ) || '/';

  /*
   * ==========================================================
   * ADMIN BYPASS
   * ==========================================================
   *
   * Admin must always remain accessible,
   * even when full-site maintenance is ON.
   */

  const isAdmin =
    pathname === '/admin' ||
    pathname.startsWith(
      '/admin/'
    );

  const isAutomatedTest =
    process.env.E2E_TEST === '1';

  /*
   * ==========================================================
   * MAINTENANCE CHECK
   * ==========================================================
   */

  let maintenance:
    | Awaited<
        ReturnType<
          typeof getMaintenanceContext
        >
      >
    | null = null;

  if (
    !isAdmin &&
    !isAutomatedTest &&
    !pathname.startsWith(
      '/api/'
    ) &&
    pathname !==
      '/maintenance'
  ) {
    try {
      maintenance =
        await getMaintenanceContext(
          pathname
        );
    } catch (
      error
    ) {
      console.error(
        '[Auronix Root Layout] Maintenance check failed:',
        error
      );
    }
  }

  const globalActive =
    strictBoolean(
      maintenance?.global?.active
    );

  const pageActive =
    strictBoolean(
      maintenance?.page?.active
    );

  /*
   * ==========================================================
   * ACTIVE MAINTENANCE
   * ==========================================================
   *
   * CRITICAL:
   *
   * Do NOT render:
   * - header
   * - footer
   * - public popup
   * - scroll typography
   * - PublicSiteChrome
   *
   * Only the maintenance shell.
   */

  if (
    !isAdmin &&
    (
      globalActive ||
      pageActive
    )
  ) {
    return (
      <html
        lang="en"
        className={
          inter.variable
        }
      >
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />

          <meta
            name="theme-color"
            content="#0A0A0A"
          />
        </head>

        <body
          className="min-h-screen bg-background antialiased"
          style={{
            fontFamily:
              'var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <ThemeProvider><MaintenanceShell
            globalActive={
              globalActive
            }
            pageActive={
              pageActive
            }
            pathname={
              pathname
            }
            globalEndAt={
              maintenance?.global
                ?.endAt ??
              null
            }
            pageEndAt={
              maintenance?.page
                ?.endAt ??
              null
            }
          /></ThemeProvider>
        </body>
      </html>
    );
  }

  /*
   * ==========================================================
   * NORMAL SITE
   * ==========================================================
   */

  return (
    <html
      lang="en"
      className={
        inter.variable
      }
      suppressHydrationWarning
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <meta
          name="theme-color"
          content="#0A0A0A"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </head>

      <body
        className="min-h-screen bg-background antialiased text-foreground"
        style={{
          fontFamily:
            'var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <ThemeProvider>
          <PublicRuntime>{children}</PublicRuntime>
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
