// =============================================================================
// FILE: app/(app)/admin/settings/page.tsx
// Admin → Settings (redesigned). Sections: General, Branding, Landing page,
// Appearance (550 themes + 150+ styles), Features, Announcement, Certificates,
// Members & IDs, Security, Sign-in page, Maintenance.
// NEW: Premium, Theme access, Attendance rules, AI grading, Data retention,
// Roles & delegation (each shows who may change it; the server re-checks).
// Open a section directly with ?section=appearance (etc.).
// =============================================================================

import type { Metadata } from 'next';
import { requirePermission, isRoyal, hasPermission } from '@/lib/auth-helpers';
import { aiConfigured } from '@/lib/ai-provider';
import { listPrograms } from '@/lib/programs';
import { getSettings } from '@/lib/settings';
import { twoFactorStats } from '@/lib/two-factor';
import SettingsShell from './SettingsShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const admin = await requirePermission('settings.edit');
  const [settings, royal, sp, stats, canSuper, canEntitle, programs] = await Promise.all([
    getSettings(),
    isRoyal(admin),
    searchParams,
    twoFactorStats(admin.orgId).catch(() => []),
    hasPermission(admin, 'premium.policy'),
    hasPermission(admin, 'themes.entitlements'),
    listPrograms(admin.orgId).catch(() => []),
  ]);

  return (
    <SettingsShell
      initial={settings}
      canRoyal={royal}
      canSuper={canSuper && royal}
      canEntitle={canEntitle}
      aiConfigured={aiConfigured()}
      emailOn={!!process.env.RESEND_API_KEY}
      programs={programs.filter((p) => p.status !== 'archived').map((p) => ({ id: p.id, name: p.name }))}
      initialSection={sp.section}
      twoFactorStats={stats}
      viewerHas2fa={admin.twoFactorEnabled === true}
    />
  );
}
