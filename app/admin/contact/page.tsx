import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function ContactAdminPage() {
  return (
    <AdminCrudPage
      title="Contact Messages"
      description="Manage incoming website inquiries."
      path="contactMessages"
      searchKeys={['name', 'company', 'email', 'category', 'message']}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'company', label: 'Company' },
        { key: 'email', label: 'Email', required: true },
        { key: 'phone', label: 'Phone' },
        { key: 'category', label: 'Category', required: true },
        { key: 'message', label: 'Message', type: 'textarea', required: true },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
