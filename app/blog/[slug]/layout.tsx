import type { Metadata } from 'next';

import {
  buildSeo,
  SEO_SITE_NAME,
} from '@/lib/seo';

import {
  adminDb,
} from '@/lib/firebase-admin';

function cleanText(
  value: unknown
) {
  return typeof value === 'string'
    ? value
        .replace(
          /<[^>]*>/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim()
    : '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const path =
    `/blog/${(await params).slug}`;

  try {
    const snapshot =
      await adminDb
        .ref(
          `blogPosts/${(await params).slug}`
        )
        .get();

    if (
      !snapshot.exists()
    ) {
      return buildSeo({
        title:
          'Article Not Found | Auronix Commerce',
        description:
          'The requested Auronix Commerce article could not be found.',
        path,
      });
    }

    const post =
      snapshot.val();

    if (
      post?.published !== true
    ) {
      return buildSeo({
        title:
          'Article | Auronix Commerce',
        description:
          'Auronix Commerce insights and business information.',
        path,
        noIndex:
          true,
      });
    }

    const title =
      cleanText(
        post?.seoTitle
      ) ||
      cleanText(
        post?.title
      ) ||
      'Auronix Commerce Article';

    const description =
      cleanText(
        post?.seoDescription
      ) ||
      cleanText(
        post?.summary
      ) ||
      cleanText(
        post?.content
      ).slice(
        0,
        155
      );

    return buildSeo({
      title:
        `${title} | ${SEO_SITE_NAME}`,
      description:
        description ||
        'Insights from Auronix Commerce LLC on eCommerce, procurement, sourcing, and marketplace operations.',
      path,
      type:
        'article',
      keywords: [
        cleanText(
          post?.category
        ),
        'Auronix Commerce',
        'eCommerce',
        'marketplace operations',
        'procurement',
        'supplier partnerships',
      ].filter(Boolean),
    });
  } catch {
    return buildSeo({
      title:
        'Auronix Commerce Article',
      description:
        'Insights from Auronix Commerce LLC.',
      path,
      type:
        'article',
    });
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
