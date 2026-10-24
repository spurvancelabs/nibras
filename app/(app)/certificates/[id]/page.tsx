// =============================================================================
// FILE: app/(app)/certificates/[id]/page.tsx   (NEW FILE)
// One certificate: printable view, verification link, details.
// =============================================================================

import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getCertificate } from '@/lib/certificates';
import { appOrigin } from '@/lib/request-info';
import { formatDate, formatDateTime } from '@/lib/time';
import CertificateView from '@/components/CertificateView';
import { PageHeader, Alert } from '@/components/ui';
import CertificateActions from './CertificateActions';

export const dynamic = 'force-dynamic';

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const c = await getCertificate(user.orgId, user, id);
  if (!c) notFound();
  const origin = await appOrigin();
  const verifyLink = `${origin}/verify/${c.certNo}`;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          back={user.role === 'student' ? { href: '/certificates', label: 'My certificates' } : { href: `/programs/${c.programId}/certificates`, label: c.programName }}
          eyebrow="Certificate"
          title={c.programName}
          subtitle={
            <>
              {c.studentName} · issued {formatDate(c.issuedAt)} · <span className="font-mono">{c.certNo}</span>
            </>
          }
          actions={<CertificateActions verifyLink={verifyLink} canShare={c.status === 'issued'} />}
        />
      </div>
      {c.status === 'revoked' && (
        <div className="no-print">
          <Alert tone="error">
            This certificate was revoked{c.revokedAt ? ` on ${formatDateTime(c.revokedAt)}` : ''}
            {c.revokedReason ? `: ${c.revokedReason}` : '.'}
          </Alert>
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <CertificateView c={c} verifyUrl={verifyLink.replace(/^https?:\/\//, '')} />
      </div>
      <p className="no-print text-center text-xs text-muted">
        Tip: in the print dialog choose <b>Landscape</b>, turn off headers &amp; footers, and turn on background graphics.
      </p>
    </div>
  );
}
