// =============================================================================
// FILE: app/verify/page.tsx   (NEW FILE — public, no sign-in)
// Look up a certificate by its number.
// =============================================================================

import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import VerifyShell from './VerifyShell';

export const dynamic = 'force-dynamic';

export default async function VerifyLookup({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const { no } = await searchParams;
  const clean = (no ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (clean) redirect(`/verify/${encodeURIComponent(clean)}`);
  const s = await getSettings();
  return (
    <VerifyShell orgName={s.orgName || 'Nibras'} logo={s.logo || ''}>
      <h1 className="text-xl font-semibold">Verify a certificate</h1>
      <p className="mt-1 text-sm text-muted">Enter the certificate number printed at the bottom of the certificate.</p>
      <form className="mt-5 flex flex-col sm:flex-row gap-2">
        <input name="no" required maxLength={40} className="input font-mono uppercase" placeholder="CERT-2026-ABCD-2345" autoComplete="off" />
        <button className="btn-primary h-10 px-5">Verify</button>
      </form>
    </VerifyShell>
  );
}
