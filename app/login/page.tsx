// =============================================================================
// FILE: app/login/page.tsx
// Login route. Redirects signed-in users to /dashboard, otherwise renders the
// form with the org name + logo from Settings.
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import LoginForm from './LoginForm';
import { findPreset } from '@/lib/theme-config';
import { characterFor } from '@/lib/appearance';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = (await auth()) as { user?: unknown } | null;
  if (session?.user) redirect('/dashboard');

  const s = await getSettings();

  return (
    <LoginForm
      orgName={s.orgName || 'Nibras'}
      logo={s.logo || ''}
      contactEmail={s.contactEmail || ''}
      supportUrl={s.supportUrl || ''}
      notice={s.loginNotice || ''}
      passwordChanged={sp.changed === '1'}
      heroArt={s.heroArt || ''}
      character={s.heroArt ? null : characterFor(findPreset(s.themePresetId), s.showScene)}
    />
  );
}