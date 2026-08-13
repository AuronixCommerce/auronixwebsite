'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteLayout } from '@/components/site/site-layout';
import { PageHeader } from '@/components/site/page-header';
import { Section } from '@/components/site/section';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/site/reveal';
import { EmptyState, ErrorState, LoadingState } from '@/components/site/states';
import { Input } from '@/components/ui/input';
import { subscribeToList } from '@/lib/firebase-db';
import type { BlogPost } from '@/lib/types';
import Link from 'next/link';
import { Search, ArrowRight, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BlogPage() {
  const [posts, setPosts] = useState<(BlogPost & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const unsubscribe = subscribeToList<BlogPost>(
      'blogPosts',
      (data) => {
        const published = data.filter((p) => p.published);
        published.sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt));
        setPosts(published);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(posts.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.summary.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  if (loading) return <SiteLayout><PageHeader eyebrow="Blog" title="Insights on modern commerce." /><Section className="border-t border-border"><LoadingState /></Section></SiteLayout>;
  if (error) return <SiteLayout><PageHeader eyebrow="Blog" title="Insights on modern commerce." /><Section className="border-t border-border"><ErrorState /></Section></SiteLayout>;

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Blog"
        title={<>Insights on modern commerce.</>}
        description="Perspectives on procurement, marketplace operations, supplier partnerships, and the future of e-commerce."
      />

      <Section className="border-t border-border">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="pl-11"
            />
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-foreground-muted hover:text-foreground hover:border-border-strong'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No articles found.' : 'No articles published yet.'}
            description={search ? 'Try a different search term.' : 'Check back soon for insights on modern commerce.'}
          />
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <Reveal className="mb-12">
                <Link href={`/blog/${featured.slug}`}>
                  <div className="group grid lg:grid-cols-2 gap-8 rounded-3xl border border-border bg-card overflow-hidden hover:shadow-premium-lg transition-all">
                    <div className="aspect-[16/10] lg:aspect-auto bg-secondary relative overflow-hidden">
                      {featured.image ? (
                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-secondary to-background-subtle flex items-center justify-center">
                          <span className="text-4xl font-semibold text-border-strong">{featured.category?.[0] || 'A'}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">{featured.category}</span>
                        <span className="text-foreground-muted">·</span>
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight leading-[1.15] mb-4 group-hover:text-accent transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-base text-foreground-muted leading-relaxed mb-6">{featured.summary}</p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:gap-2.5 transition-all">
                        Read article
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Rest of posts */}
            {rest.length > 0 && (
              <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((post) => (
                  <StaggerItem key={post.id}>
                    <Link href={`/blog/${post.slug}`}>
                      <div className="group rounded-2xl border border-border bg-card overflow-hidden h-full hover:shadow-premium-lg transition-all">
                        <div className="aspect-[16/10] bg-secondary overflow-hidden">
                          {post.image ? (
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-secondary to-background-subtle flex items-center justify-center">
                              <span className="text-3xl font-semibold text-border-strong">{post.category?.[0] || 'A'}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-accent">{post.category}</span>
                          </div>
                          <h3 className="text-lg font-semibold tracking-tight leading-[1.2] mb-2 group-hover:text-accent transition-colors">{post.title}</h3>
                          <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2">{post.summary}</p>
                          <div className="flex items-center gap-3 mt-4 text-xs text-foreground-muted">
                            <span>{post.author}</span>
                            <span>·</span>
                            <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            )}
          </>
        )}
      </Section>
    </SiteLayout>
  );
}
