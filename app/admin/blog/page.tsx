import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function BlogAdminPage() {
  return (
    <AdminCrudPage
      title="Blog"
      description="Create, edit, publish, and manage Auronix articles."
      path="blogPosts"
      searchKeys={['title', 'slug', 'author', 'category', 'summary']}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'slug', label: 'Slug', required: true },
        { key: 'summary', label: 'Summary', type: 'textarea', required: true },
        { key: 'content', label: 'Content', type: 'textarea', required: true },
        { key: 'author', label: 'Author', required: true },
        { key: 'image', label: 'Image URL' },
        { key: 'category', label: 'Category' },
        { key: 'published', label: 'Published', type: 'boolean' },
        { key: 'seoTitle', label: 'SEO Title' },
        { key: 'seoDescription', label: 'SEO Description', type: 'textarea' },
      ]}
    />
  );
}
