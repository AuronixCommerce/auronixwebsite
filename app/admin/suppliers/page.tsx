import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function SuppliersAdminPage() {
  return (
    <AdminCrudPage
      title="Supplier Submissions"
      description="Review and manage supplier submissions."
      path="suppliers"
      searchKeys={['companyName', 'contactName', 'email', 'country']}
      fields={[
        { key: 'companyName', label: 'Company Name', required: true },
        { key: 'contactName', label: 'Contact Name', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'phone', label: 'Phone', required: true },
        { key: 'website', label: 'Website' },
        { key: 'country', label: 'Country' },
        { key: 'categories', label: 'Categories' },
        { key: 'yearsInBusiness', label: 'Years in Business' },
        { key: 'distributionModel', label: 'Distribution Model' },
        { key: 'catalogUrl', label: 'Catalog URL' },
        { key: 'message', label: 'Message', type: 'textarea' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
