import { AdminCrudPage } from '@/components/admin/admin-crud-page';

export default function CareersAdminPage() {
  return (
    <AdminCrudPage
      title="Careers"
      description="Manage active and archived job postings."
      path="careers"
      searchKeys={['title', 'department', 'location', 'employmentType']}
      fields={[
        { key: 'title', label: 'Job Title', required: true },
        { key: 'department', label: 'Department' },
        { key: 'location', label: 'Location' },
        { key: 'employmentType', label: 'Employment Type' },
        { key: 'description', label: 'Description', type: 'textarea', required: true },
        { key: 'requirements', label: 'Requirements', type: 'textarea' },
        { key: 'applicationInstructions', label: 'Application Instructions', type: 'textarea' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
