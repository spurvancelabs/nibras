// =============================================================================
// FILE: app/reset-password/page.tsx   (NEW FILE)
// Choose a new password from an emailed link.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { checkResetToken } from '@/lib/password-reset';
import AuthCard from './AuthCard';
import ResetForm from './ResetForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Choose a new password', referrer: 'no-referrer' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const s = await getSettings();
  const valid = await checkResetToken(token).catch(() => false);
  return (
    <AuthCard orgName={s.orgName || 'Nibras'} title="Choose a new password" subtitle={valid ? `At least ${s.passwordMinLength} characters. You'll be signed out on every device.` : undefined}>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4 text-sm">
          <p>This link has expired or was already used.</p>
          <Link href="/forgot-password" className="btn-primary w-full">
            Get a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
