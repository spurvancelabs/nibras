// =============================================================================
// FILE: app/(app)/admin/users/import/page.tsx
// Bulk CSV import page (admin). Passes member-ID rules from Settings.
// =============================================================================

import { requireRole } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import ImportForm from './ImportForm';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ImportUsersPage() {
  await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        back={{ href: '/admin/users', label: 'Back to users' }}
        eyebrow="Users"
        title="Import users"
        subtitle="Upload or paste a CSV to create users in bulk. Up to 500 rows."
      />
      <ImportForm
        memberIdRequired={settings.memberIdRequired}
        memberIdFormat={settings.memberIdFormat}
      />
    </div>
  );
}