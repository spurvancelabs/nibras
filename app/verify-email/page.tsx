// =============================================================================
// FILE: app/verify-email/page.tsx   (NEW FILE)
// Confirms an email address from the sign-up link. The token is used by a
// button press (POST), not on page load, so email scanners that open links
// can't use it up.
// =============================================================================

import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import AuthCard from '../reset-password/AuthCard';
import VerifyButton from './VerifyButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Confirm your email', referrer: 'no-referrer' };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const s = await getSettings();
  return (
    <AuthCard orgName={s.orgName || 'Nibras'} title="Confirm your email" subtitle="One click and you're done.">
      <VerifyButton token={token} />
    </AuthCard>
  );
}
