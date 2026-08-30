'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getList,
  pushData,
  updateData,
  removeData,
} from '@/lib/firebase-db';
import type { BlogPost } from '@/lib/types';
import { AdminLayout } from '@/components/admin/admin-layout';
import { confirmAction, notifyAction } from '@/components/ui/confirm-action';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  Search,
  Save,
} from 'lucide-react';

type BlogRecord = BlogPost & { id: string };

const emptyForm = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  author: '',
  image: '',
  category: '',
  seoTitle: '',
  seoDescription: '',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const loadPosts = async () => {
    try {
      const data = await getList<BlogPost>(
        'blogPosts',
        'createdAt'
      );

      setPosts(
        [...data].sort(
          (a, b) =>
            Number(b.createdAt || 0) -
            Number(a.createdAt || 0)
        )
      );
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return posts;

    return posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(q) ||
        post.summary?.toLowerCase().includes(q) ||
        post.category?.toLowerCase().includes(q) ||
        post.author?.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (post: BlogRecord) => {
    setEditingId(post.id);

    setForm({
      title: post.title || '',
      slug: post.slug || '',
      summary: post.summary || '',
      content: post.content || '',
      author: post.author || '',
      image: post.image || '',
      category: post.category || '',
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || '',
    });

    setEditorOpen(true);
  };

  const savePost = async (publish: boolean) => {
    if (!form.title.trim()) {
      notifyAction('Title is required.');
      return;
    }

    if (!form.content.trim()) {
      notifyAction('Content is required.');
      return;
    }

    setSaving(true);

    try {
      const now = Date.now();

      const record: Omit<
        BlogPost,
        'createdAt' | 'updatedAt'
      > & {
        createdAt?: number;
        updatedAt?: number;
      } = {
        title: form.title.trim(),
        slug:
          form.slug.trim() ||
          slugify(form.title),
        summary: form.summary.trim(),
        content: form.content.trim(),
        author: form.author.trim() || 'Auronix Commerce LLC',
        image: form.image.trim() || undefined,
        category: form.category.trim() || 'General',
        published: publish,
        seoTitle:
          form.seoTitle.trim() ||
          form.title.trim(),
        seoDescription:
          form.seoDescription.trim() ||
          form.summary.trim(),
      };

      if (editingId) {
        await updateData(
          `blogPosts/${editingId}`,
          {
            ...record,
            updatedAt: now,
            ...(publish
              ? { publishedAt: now }
              : {}),
          }
        );
      } else {
        await pushData('blogPosts', {
          ...record,
          createdAt: now,
          updatedAt: now,
          publishedAt: publish
            ? now
            : undefined,
        });
      }

      await loadPosts();

      setEditorOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to save blog post.'
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (
    post: BlogRecord
  ) => {
    try {
      const next = !post.published;

      await updateData(
        `blogPosts/${post.id}`,
        {
          published: next,
          publishedAt: next
            ? Date.now()
            : post.publishedAt || null,
          updatedAt: Date.now(),
        }
      );

      await loadPosts();
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to update publication status.'
      );
    }
  };

  const deletePost = async (id: string) => {
    if (
      !await confirmAction({
        title: 'Delete this blog post?',
        description: 'The post will be permanently removed. This action cannot be undone.',
        confirmLabel: 'Delete post',
        destructive: true,
      })
    ) {
      return;
    }

    try {
      await removeData(`blogPosts/${id}`);
      await loadPosts();
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? error.message
          : 'Unable to delete blog post.'
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
              AURONIX ADMIN
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Blog
            </h1>

            <p className="mt-2 text-sm text-foreground-muted">
              Create, edit, publish, and manage website articles.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Article
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search articles…"
            className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-4 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-foreground-muted">
              No articles found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className="p-5"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold truncate">
                          {post.title}
                        </h2>

                        <span
                          className={`text-[11px] rounded-full px-2.5 py-1 ${
                            post.published
                              ? 'bg-green-500/10 text-green-700'
                              : 'bg-secondary text-foreground-muted'
                          }`}
                        >
                          {post.published
                            ? 'Published'
                            : 'Draft'}
                        </span>
                      </div>

                      <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
                        {post.summary}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs text-foreground-muted mt-3">
                        <span>
                          {post.category}
                        </span>

                        <span>
                          {post.author}
                        </span>

                        <span>
                          /blog/{post.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          togglePublished(post)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary"
                      >
                        {post.published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}

                        {post.published
                          ? 'Unpublish'
                          : 'Publish'}
                      </button>

                      <button
                        onClick={() =>
                          openEdit(post)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deletePost(post.id)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 text-red-600 px-3 py-2 text-sm hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingId
                    ? 'Edit Article'
                    : 'New Article'}
                </h2>

                <p className="text-sm text-foreground-muted mt-1">
                  Build a complete article for the Auronix website.
                </p>
              </div>

              <button
                onClick={() =>
                  setEditorOpen(false)
                }
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Field
                label="Title"
                value={form.title}
                onChange={(value) =>
                  setForm({
                    ...form,
                    title: value,
                    slug:
                      form.slug ||
                      slugify(value),
                  })
                }
              />

              <Field
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  setForm({
                    ...form,
                    slug: slugify(value),
                  })
                }
              />

              <Field
                label="Author"
                value={form.author}
                onChange={(value) =>
                  setForm({
                    ...form,
                    author: value,
                  })
                }
              />

              <Field
                label="Category"
                value={form.category}
                onChange={(value) =>
                  setForm({
                    ...form,
                    category: value,
                  })
                }
              />

              <div className="lg:col-span-2">
                <Field
                  label="Featured Image URL"
                  value={form.image}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      image: value,
                    })
                  }
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Summary
                </label>

                <textarea
                  value={form.summary}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      summary:
                        e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Content
                </label>

                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      content:
                        e.target.value,
                    })
                  }
                  rows={16}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed"
                  placeholder="Write the article content here…"
                />
              </div>

              <Field
                label="SEO Title"
                value={form.seoTitle}
                onChange={(value) =>
                  setForm({
                    ...form,
                    seoTitle: value,
                  })
                }
              />

              <Field
                label="SEO Description"
                value={form.seoDescription}
                onChange={(value) =>
                  setForm({
                    ...form,
                    seoDescription:
                      value,
                  })
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-7">
              <button
                onClick={() =>
                  setEditorOpen(false)
                }
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  savePost(false)
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Draft
              </button>

              <button
                onClick={() =>
                  savePost(true)
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
      />
    </div>
  );
}
