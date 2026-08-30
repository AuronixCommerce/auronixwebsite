import type { MetadataRoute } from 'next';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  SEO_SITE_URL,
} from '@/lib/seo';
import { TROUBLESHOOTING_ARTICLES } from '@/lib/help-content';

type Frequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: Frequency;
  priority: number;
}> = [
  {
    path: '/',
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/about',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/solutions',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/our-process',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/why-work-with-us',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/marketplace-expertise',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/partners',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/supplier',
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    path: '/contact',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/support',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/faq',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/company-verification',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/careers',
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    path: '/blog',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/seller',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/seller/policy',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/help',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/whats-new',
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    path: '/privacy',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/terms',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/disclaimer',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/cookie-policy',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap =
    PUBLIC_ROUTES.map(
      ({
        path,
        changeFrequency,
        priority,
      }) => ({
        url:
          path === '/'
            ? SEO_SITE_URL
            : `${SEO_SITE_URL}${path}`,

        lastModified:
          new Date(),

        changeFrequency,

        priority,
      })
    );

  routes.push(...TROUBLESHOOTING_ARTICLES.map((article) => ({
    url: `${SEO_SITE_URL}/help/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  })));

  try {
    const snapshot =
      await Promise.race([
        adminDb
          .ref('blogPosts')
          .get(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Sitemap blog lookup timed out')),
            5000
          );
        }),
      ]);

    if (
      snapshot.exists()
    ) {
      const posts =
        snapshot.val();

      for (
        const post of Object.values(
          posts as Record<
            string,
            any
          >
        )
      ) {
        if (
          !post ||
          typeof post !==
            'object'
        ) {
          continue;
        }

        if (
          post.published !==
            true ||
          !post.slug
        ) {
          continue;
        }

        routes.push({
          url:
            `${SEO_SITE_URL}/blog/${String(
              post.slug
            )}`,

          lastModified:
            post.updatedAt
              ? new Date(
                  post.updatedAt
                )
              : new Date(),

          changeFrequency:
            'monthly',

          priority:
            0.75,
        });
      }
    }
  } catch (
    error
  ) {
    console.error(
      'Sitemap blog loading failed:',
      error
    );
  }

  return routes;
}
