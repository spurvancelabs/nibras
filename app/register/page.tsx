// =============================================================================
// FILE: app/register/page.tsx   (NEW FILE)
// Self-registration (only when a Super Admin switches it on in Settings).
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import AuthCard from '../reset-password/AuthCard';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create an account' };

export default async function RegisterPage() {
  const session = (await auth()) as { user?: unknown } | null;
  if (session?.user) redirect('/dashboard');
  const s = await getSettings();
  const org = s.orgName || 'Nibras';
  if (!s.registrationEnabled) {
    return (
      <AuthCard orgName={org} title="Sign-up is closed" subtitle="Accounts are created by your organisation.">
        <Link href="/login" className="btn-primary w-full">
          Go to sign in
        </Link>
      </AuthCard>
    );
  }
  const domains = s.registrationDomains
    .split(',')
    .map((d) => d.trim().replace(/^@/, ''))
    .filter(Boolean);
  return (
    <AuthCard
      orgName={org}
      title={`Join ${org}`}
      subtitle={s.registrationMessage || (s.registrationMode === 'approval' ? 'Create your learner account. An admin will approve it.' : 'Create your learner account.')}
    >
      <RegisterForm minLength={s.passwordMinLength} domains={domains} />
    </AuthCard>
  );
}
