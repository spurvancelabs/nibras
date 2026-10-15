// =============================================================================
// FILE: app/(app)/admin/settings/page.tsx
// Admin → Global settings page (branding, theme, landing, members, contact).
// =============================================================================

import { requireRole } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import SettingsForm from './SettingsForm';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Global settings"
        subtitle="These settings apply across the entire platform."
      />
      <SettingsForm initial={settings} />
    </div>
  );
}