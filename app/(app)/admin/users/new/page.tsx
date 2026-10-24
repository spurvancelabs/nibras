// =============================================================================
// FILE: app/(app)/admin/users/new/page.tsx
// Create-user page (admin). Passes member-ID rules from Settings to the form.
// =============================================================================

import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import NewUserForm from './NewUserForm';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  const admin = await requireRole('admin');
  const [settings, royal] = await Promise.all([getSettings(), isRoyal(admin)]);

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
        canCreateAdmins={royal}
      />
    </div>
  );
}