import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function FAQsAdminPage() {
  return (
    <AdminCrudPage
      title="FAQs"
      description="Manage the public FAQ library."
      path="faqs"
      searchKeys={['question', 'answer', 'category']}
      fields={[
        { key: 'question', label: 'Question', required: true },
        { key: 'answer', label: 'Answer', type: 'textarea', required: true },
        { key: 'category', label: 'Category' },
        { key: 'order', label: 'Order', type: 'number' },
        { key: 'active', label: 'Active', type: 'boolean' },
      ]}
    />
  );
}
