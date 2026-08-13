'use client';

import { useEffect, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { Section } from '@/components/site/section';
import { Reveal } from '@/components/site/reveal';
import { LoadingState, ErrorState, EmptyState } from '@/components/site/states';
import { getData } from '@/lib/firebase-db';
import type { BlogPost } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [related, setRelated] = useState<(BlogPost & { id: string })[]>([]);

  useEffect(() => {
    getData<BlogPost>(`blogPosts/${params.slug}`)
      .then((data) => {
        if (!data || !data.published) {
          setPost(null);
          setLoading(false);
          return;
        }
        setPost(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [params.slug]);

  if (loading) return <SiteLayout><Section className="pt-32"><LoadingState /></Section></SiteLayout>;
  if (error) return <SiteLayout><Section className="pt-32"><ErrorState /></Section></SiteLayout>;
  if (!post) return notFound();

  return (
    <SiteLayout>
      <article>
        {/* Hero */}
        <header className="pt-32 pb-16 lg:pt-40 lg:pb-20">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
            <Reveal>
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to blog
              </Link>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">{post.category}</span>
                <span className="text-foreground-muted">·</span>
                <span className="text-xs text-foreground-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] text-balance">
                {post.title}
              </h1>
              <p className="mt-5 text-lg text-foreground-muted leading-relaxed">{post.summary}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{post.author?.[0] || 'A'}</span>
                </div>
                <div>
                  <div className="text-sm font-medium">{post.author}</div>
                  <div className="text-xs text-foreground-muted">
                    {Math.ceil(post.content.length / 1000) || 1} min read
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </header>

        {/* Cover image */}
        {post.image && (
          <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 mb-16">
            <Reveal>
              <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-secondary">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
              </div>
            </Reveal>
          </div>
        )}

        {/* Content */}
        <Section className="border-t border-border !py-16">
          <div className="max-w-2xl mx-auto">
            <Reveal>
              <div className="prose prose-lg max-w-none">
                {post.content.split('\n').map((paragraph, i) => (
                  paragraph.trim() ? <p key={i} className="text-base lg:text-lg text-foreground-muted leading-relaxed mb-6">{paragraph}</p> : null
                ))}
              </div>
            </Reveal>
          </div>
        </Section>

        {/* CTA */}
        <Section className="border-t border-border bg-background-subtle !py-20">
          <Reveal className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Interested in working with Auronix?</h2>
            <p className="text-base text-foreground-muted mb-8">We would like to hear from you.</p>
            <Link href="/contact" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all">
              Contact Auronix
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </Section>
      </article>
    </SiteLayout>
  );
}
