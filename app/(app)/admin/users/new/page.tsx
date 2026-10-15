// =============================================================================
// FILE: app/(app)/admin/users/new/page.tsx
// Create-user page (admin). Passes member-ID rules from Settings to the form.
// =============================================================================

import { requireRole } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import NewUserForm from './NewUserForm';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: '/admin/users', label: 'All users' }}
        eyebrow="Users"
        title="New user"
        subtitle="Create an account for a mentor, student, or admin."
      />
      <NewUserForm
        memberIdRequired={settings.memberIdRequired}
        memberIdFormat={settings.memberIdFormat}
      />
    </div>
  );
}