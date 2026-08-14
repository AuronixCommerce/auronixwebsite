'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Search } from 'lucide-react';

import { getList } from '@/lib/firebase-db';
import type { BlogPost } from '@/lib/types';

type BlogRecord = BlogPost & {
  id: string;
};

export function BlogContent() {
  const [posts, setPosts] = useState<BlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      try {
        const result = await getList<BlogPost>('blogPosts');

        if (cancelled) return;

        const publishedPosts = result
          .filter((post) => post.published === true)
          .sort((a, b) => {
            const aDate = Number(
              a.publishedAt ?? a.createdAt ?? 0
            );

            const bDate = Number(
              b.publishedAt ?? b.createdAt ?? 0
            );

            return bDate - aDate;
          });

        setPosts(publishedPosts);
      } catch (error) {
        console.error('Failed to load blog posts:', error);

        if (!cancelled) {
          setPosts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return posts;
    }

    return posts.filter((post) => {
      const title = post.title ?? '';
      const summary = post.summary ?? '';
      const category = post.category ?? '';
      const author = post.author ?? '';
      const content = post.content ?? '';

      return (
        title.toLowerCase().includes(query) ||
        summary.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        author.toLowerCase().includes(query) ||
        content.toLowerCase().includes(query)
      );
    });
  }, [posts, search]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted pointer-events-none" />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search articles..."
          aria-label="Search articles"
          className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-14 flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-foreground-muted" />

          <p className="mt-4 text-sm text-foreground-muted">
            Loading articles...
          </p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-14 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
            <FileText className="w-6 h-6 text-foreground-muted" />
          </div>

          <h2 className="mt-5 text-xl font-semibold">
            {search ? 'No matching articles' : 'No published articles yet'}
          </h2>

          <p className="mt-2 text-sm text-foreground-muted">
            {search
              ? 'Try another search term.'
              : 'Published articles will appear here.'}
          </p>

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group rounded-2xl border border-border bg-card overflow-hidden"
            >
              {post.image ? (
                <Link
                  href={`/blog/${post.slug}`}
                  className="block aspect-[16/9] bg-secondary overflow-hidden"
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
              ) : (
                <Link
                  href={`/blog/${post.slug}`}
                  className="block aspect-[16/9] bg-secondary flex items-center justify-center"
                >
                  <FileText className="w-10 h-10 text-foreground-muted" />
                </Link>
              )}

              <div className="p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                  {post.category || 'General'}
                </div>

                <h2 className="mt-3 text-xl font-semibold tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-accent transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>

                {post.summary && (
                  <p className="mt-3 text-sm text-foreground-muted leading-relaxed line-clamp-3">
                    {post.summary}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-xs text-foreground-muted truncate">
                    {post.author || 'Auronix Commerce LLC'}
                  </span>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="shrink-0 text-xs font-medium text-foreground hover:text-accent transition-colors"
                  >
                    Read article →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}