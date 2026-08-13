import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function PartnersAdminPage() {
  return (
    <AdminCrudPage
      title="Partners"
      description="Manage approved partner records shown across the website."
      path="partners"
      searchKeys={['name', 'category', 'description']}
      fields={[
        { key: 'name', label: 'Partner Name', required: true },
        { key: 'category', label: 'Category', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'website', label: 'Website' },
        { key: 'logoUrl', label: 'Logo URL' },
        { key: 'active', label: 'Active', type: 'boolean' },
      ]}
    />
  );
}
