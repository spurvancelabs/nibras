// =============================================================================
// FILE: app/(app)/layout.tsx
// Signed-in app frame.
//   - personal colour theme + design style (if allowed in Settings), with the
//     fonts they need
//   - royal flag + feature switches for the menu, announcement banner
//   - maintenance mode (students and mentors see a notice; admins keep
//     working with a warning bar)
//   - two-step sign-in reminder when Settings require it for this user
//   - NEW: premium themes/styles are only applied while the user has
//     Premium. If it ended, the organisation theme is shown instead (their
//     choice is kept, never deleted) with a friendly notice.
//   - NEW: role level (Super/Royal), premium badge and permission
//     delegation for the grouped menu.
// =============================================================================

import { requireAuth, mustSetUp2fa } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { findPreset } from '@/lib/theme-config';
import { presetCss, fontsHref } from '@/lib/theme-css';
import { findUiStyle, uiStyleCss } from '@/lib/ui-styles';
import { themeTier, styleTier, canUseTier, hasPremiumAccess, isPremiumActive } from '@/lib/entitlements';
import { policyFrom } from '@/lib/premium';
import AppShell from '@/components/AppShell';
import type { PermissionOverrides } from '@/lib/rbac';
import LogoutButton from '@/components/LogoutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The layout itself must render for users who still need to set up 2FA
  // (they are sent to Profile → Security by every other page).
  const user = await requireAuth({ allowWithout2fa: true });
  const s = await getSettings();

  // Maintenance mode: everyone except admins sees a notice page.
  if (s.maintenanceMode && user.role !== 'admin') {
    return (
      <main className="min-h-dvh grid place-items-center text-text p-6">
        <div className="max-w-md w-full text-center bg-surface border border-border rounded-[var(--radius-lg)] p-8 space-y-4 shadow-xl">
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

  // Personal appearance (never let it break the page).
  let personalCss = '';
  let personalFonts: string | null = null;
  let paused = false;
  const policy = policyFrom(s);
  try {
    let preset = s.allowUserThemes ? findPreset(user.themePreset) : undefined;
    let style = s.allowUserStyles ? findUiStyle(user.uiStyle) : undefined;
    if (preset && !canUseTier(themeTier(preset, policy), user, policy)) {
      preset = undefined;
      paused = true;
    }
    if (style && !canUseTier(styleTier(style, policy), user, policy)) {
      style = undefined;
      paused = true;
    }
    if (preset) personalCss += presetCss(preset, { showScene: s.showScene });
    if (style) personalCss += uiStyleCss(style);
    if (preset || style) personalFonts = fontsHref(preset?.font, style);
  } catch (e) {
    console.error('[app layout] personal appearance failed (using organisation theme):', e);
    personalCss = '';
  }

  const needs2fa = await mustSetUp2fa(user);

  const announcement =
    s.announcementEnabled &&
    s.announcementText.trim() &&
    (s.announcementAudience === 'all' || s.announcementAudience === user.role)
      ? { text: s.announcementText, tone: s.announcementTone, link: s.announcementLink }
      : null;

  return (
    <>
      {/* Plain link (no `precedence`): fonts never block or break rendering. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      {personalFonts && <link rel="stylesheet" href={personalFonts} />}
      {personalCss && <style id="personal-appearance" dangerouslySetInnerHTML={{ __html: personalCss }} />}
      <AppShell
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          royal: user.role === 'admin' && user.royal === true,
          superAdmin: user.role === 'admin' && user.superAdmin === true,
          // badge only for real members (admins have access but no badge)
          premium: policy.premiumEnabled && isPremiumActive(user.premiumUntil),
          avatar: user.avatar,
        }}
        overrides={s.permissionOverrides as PermissionOverrides}
        notice={
          paused && !hasPremiumAccess(user, policy)
            ? {
                text: user.premiumUntil
                  ? 'Your Premium has ended, so your premium theme is paused and the organisation theme is shown. Your choice is saved and comes back when you renew.'
                  : 'Your chosen theme is now part of Premium, so the organisation theme is shown for now. Your choice is saved and comes back if you get Premium.',
                href: '/premium',
                cta: user.premiumUntil ? 'Renew Premium' : 'See Premium',
              }
            : null
        }
        orgName={s.orgName || 'Nibras'}
        logo={s.logo || ''}
        features={{
          quizzes: s.featureQuizzes,
          certificates: s.featureCertificates,
          queries: s.featureQueries,
          gradebook: s.featureGradebook,
          premium: s.premiumEnabled === true,
        }}
        announcement={announcement}
        maintenance={s.maintenanceMode && user.role === 'admin'}
        needs2fa={needs2fa}
      >
        {children}
      </AppShell>
    </>
  );
}
