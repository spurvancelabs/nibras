// =============================================================================
// FILE: app/(app)/certificates/page.tsx   (NEW FILE)
// Students: "my certificates". Staff: every certificate they can see.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listCertificates } from '@/lib/certificates';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/time';
import { PageHeader, EmptyNote, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireAuth();
  const settings = await getSettings();
  if (!settings.featureCertificates) return <EmptyNote title="Certificates are turned off." text="An admin can turn them on in Settings → Features." />;
  const { q = '' } = await searchParams;
  const all = await listCertificates(user.orgId, user);
  const needle = q.trim().toLowerCase();
  const certs = needle
    ? all.filter((c) => [c.studentName, c.programName, c.certNo, c.memberId].some((v) => v?.toLowerCase().includes(needle)))
    : all;
  const isStudent = user.role === 'student';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Certificates"
        title={isStudent ? 'My certificates' : 'Certificates'}
        subtitle={isStudent ? 'Certificates you earned. Open one to print it or share its verification link.' : `${all.length} issued in total. Issue new ones from a program's Certificates tab.`}
      />
      {!isStudent && (
        <form className="flex gap-2 max-w-md">
          <input name="q" defaultValue={q} className="input" placeholder="Search name, program, certificate no." />
          <button className="btn-outline h-10 px-4">Search</button>
        </form>
      )}
      {certs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            title={isStudent ? 'No certificates yet' : 'No certificates found'}
            text={isStudent ? 'Finish a program and meet its requirements, and your certificate will appear here.' : undefined}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {certs.map((c) => (
            <Link
              key={c.id}
              href={`/certificates/${c.id}`}
              className="group relative overflow-hidden bg-surface border border-border rounded-[var(--radius-lg)] p-5 hover:border-primary transition"
            >
              <div aria-hidden className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-hero group-hover:scale-110 transition" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl" aria-hidden>🎓</span>
                  {c.status === 'revoked' ? <Badge tone="danger">revoked</Badge> : <Badge tone="success">valid</Badge>}
                </div>
                <p className="mt-3 font-semibold leading-snug">{c.programName}</p>
                {!isStudent && <p className="text-sm">{c.studentName}</p>}
                <p className="mt-2 text-xs text-muted">
                  {formatDate(c.issuedAt)} · <span className="font-mono">{c.certNo}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
