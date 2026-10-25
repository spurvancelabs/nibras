// =============================================================================
// FILE: app/(app)/admin/settings/page.tsx
// Admin → Settings (redesigned). Sections: General, Branding, Landing page,
// Appearance (550 themes + 150+ styles), Features, Announcement, Certificates,
// Members & IDs, Security, Sign-in page, Maintenance.
// Open a section directly with ?section=appearance (etc.).
// =============================================================================

import type { Metadata } from 'next';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { twoFactorStats } from '@/lib/two-factor';
import SettingsShell from './SettingsShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const admin = await requireRole('admin');
  const [settings, royal, sp, stats] = await Promise.all([
    getSettings(),
    isRoyal(admin),
    searchParams,
    twoFactorStats(admin.orgId).catch(() => []),
  ]);

  return (
    <SettingsShell
      initial={settings}
      canRoyal={royal}
      initialSection={sp.section}
      twoFactorStats={stats}
      viewerHas2fa={admin.twoFactorEnabled === true}
    />
  );
}
