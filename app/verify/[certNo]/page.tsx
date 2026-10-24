// =============================================================================
// FILE: app/verify/[certNo]/page.tsx   (NEW FILE — public, no sign-in)
// Shows whether a certificate number is genuine. Only shows what is printed on
// the certificate itself (name, program, date) — no emails, no scores.
// =============================================================================

import type { Metadata } from 'next';
import { verifyCertificate } from '@/lib/certificates';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/time';
import VerifyShell from '../VerifyShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VerifyPage({ params }: { params: Promise<{ certNo: string }> }) {
  const { certNo } = await params;
  const [c, s] = await Promise.all([verifyCertificate(decodeURIComponent(certNo)).catch(() => null), getSettings()]);
  const orgName = s.orgName || 'Nibras';

  return (
    <VerifyShell orgName={orgName} logo={s.logo || ''}>
      {!c ? (
        <div className="text-center">
          <span className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-hero text-2xl" aria-hidden>?</span>
          <h1 className="mt-4 text-xl font-semibold">Certificate not found</h1>
          <p className="mt-1 text-sm text-muted">
            No certificate with number <span className="font-mono">{decodeURIComponent(certNo).slice(0, 40)}</span> was issued by {orgName}. Check the number and try again.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <span
            className={`mx-auto grid place-items-center w-14 h-14 rounded-full text-2xl text-white ${c.status === 'issued' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`}
            aria-hidden
          >
            {c.status === 'issued' ? '✓' : '✕'}
          </span>
          <h1 className="mt-4 text-xl font-semibold">{c.status === 'issued' ? 'Valid certificate' : 'This certificate was revoked'}</h1>
          <dl className="mt-6 text-left text-sm divide-y divide-border border-y border-border">
            {(
              [
                ['Awarded to', c.studentName],
                ['Program', c.programName],
                ['Certificate', c.title],
                ['Issued by', c.issuerName || orgName],
                ['Date of issue', formatDate(c.issuedAt)],
                ['Certificate no.', c.certNo],
                ...(c.status === 'revoked'
                  ? ([
                      ['Revoked on', c.revokedAt ? formatDate(c.revokedAt) : '—'],
                      ['Reason', c.revokedReason || '—'],
                    ] as [string, string][])
                  : []),
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className={`font-medium text-right ${k === 'Certificate no.' ? 'font-mono' : ''}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </VerifyShell>
  );
}
