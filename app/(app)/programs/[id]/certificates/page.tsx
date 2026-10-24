// =============================================================================
// FILE: app/(app)/programs/[id]/certificates/page.tsx   (NEW FILE)
// Certificates for one program (staff). Admins issue/revoke; mentors view.
// =============================================================================

import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { hubAccess } from '@/lib/program-hub';
import { getEligibility, listCertificates } from '@/lib/certificates';
import { getSettings } from '@/lib/settings';
import { appOrigin } from '@/lib/request-info';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import { PageHeader, EmptyNote } from '@/components/ui';
import CertificateManager from './CertificateManager';

export const dynamic = 'force-dynamic';

export default async function ProgramCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  if ((await hubAccess(user.orgId, user, id)) !== 'manage') notFound();
  const settings = await getSettings();
  if (!settings.featureCertificates) return <EmptyNote title="Certificates are turned off." text="An admin can turn them on in Settings → Features." />;
  await db();
  const program = (await Program.findById(id).select('name').lean()) as { name: string } | null;
  const [elig, issued, origin] = await Promise.all([getEligibility(user.orgId, id), listCertificates(user.orgId, user, id), appOrigin()]);
  if (!elig || !program) notFound();
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: `/programs/${id}`, label: program.name }} eyebrow="Certificates" title={program.name} subtitle="Set the design and rules, then issue certificates to students who completed the program." />
      <CertificateManager
        programId={id}
        programName={program.name}
        canIssue={user.role === 'admin'}
        cfg={elig.cfg}
        rows={elig.rows}
        issued={issued}
        verifyBase={origin.replace(/^https?:\/\//, '')}
        defaults={{
          issuerName: settings.certIssuerName || settings.orgName,
          signatoryName: settings.certSignatoryName,
          signatoryTitle: settings.certSignatoryTitle,
          signatureImage: settings.certSignatureImage,
          logo: settings.logo,
          footerText: settings.certFooterText,
          prefix: settings.certPrefix || 'CERT',
        }}
      />
    </div>
  );
}
