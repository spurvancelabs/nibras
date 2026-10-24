// =============================================================================
// FILE: app/(app)/layout.tsx
// Signed-in app frame.
// NEW: royal flag + feature switches for the menu, announcement banner,
// personal theme (if allowed in Settings) and maintenance mode (students and
// mentors see a notice; admins keep working with a warning bar).
// =============================================================================

import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { findPreset } from '@/lib/theme-config';
import { presetCss } from '@/lib/theme-css';
import AppShell from '@/components/AppShell';
import LogoutButton from '@/components/LogoutButton';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const s = await getSettings();

  // Maintenance mode: everyone except admins sees a notice page.
  if (s.maintenanceMode && user.role !== 'admin') {
    return (
      <main className="min-h-screen grid place-items-center bg-bg text-text p-6">
        <div className="max-w-md w-full text-center bg-surface border border-border rounded-[var(--radius-lg)] p-8 space-y-4">
          <span className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-hero text-2xl" aria-hidden>🛠️</span>
          <h1 className="text-xl font-semibold">{s.orgName || 'Nibras'} is under maintenance</h1>
          <p className="text-sm text-muted whitespace-pre-line">{s.maintenanceMessage}</p>
          <div className="flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  const personal = s.allowUserThemes ? findPreset(user.themePreset) : undefined;
  const announcement =
    s.announcementEnabled &&
    s.announcementText.trim() &&
    (s.announcementAudience === 'all' || s.announcementAudience === user.role)
      ? { text: s.announcementText, tone: s.announcementTone, link: s.announcementLink }
      : null;

  return (
    <>
      {personal && <style dangerouslySetInnerHTML={{ __html: presetCss(personal) }} />}
      <AppShell
        user={{ name: user.name, role: user.role, royal: user.role === 'admin' && user.royal === true }}
        orgName={s.orgName || 'Nibras'}
        logo={s.logo || ''}
        features={{
          quizzes: s.featureQuizzes,
          certificates: s.featureCertificates,
          queries: s.featureQueries,
          gradebook: s.featureGradebook,
        }}
        announcement={announcement}
        maintenance={s.maintenanceMode && user.role === 'admin'}
      >
        {children}
      </AppShell>
    </>
  );
}
