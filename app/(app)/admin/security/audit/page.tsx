// =============================================================================
// FILE: app/(app)/admin/security/audit/page.tsx   (NEW FILE — replaces
// /admin/users/audit, which now redirects here). Royal admins only.
// Filters: category, event, text, IP, user, date range. Each row shows whether
// its signature verifies. CSV export of the current filter.
// =============================================================================

import Link from 'next/link';
import { requireRoyal } from '@/lib/auth-helpers';
import { listAudit, AUDIT_LABELS, AUDIT_GROUPS, type AuditAction } from '@/lib/audit';
import { parseAuditQuery } from '@/lib/audit-query';
import { getUserNames } from '@/lib/users';
import { formatDateTime, timeZoneLabel } from '@/lib/time';
import { PageHeader, Badge, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

type SP = Promise<Record<string, string | undefined>>;
const PAGE = 100;

const TONE: Partial<Record<AuditAction, 'primary' | 'warning' | 'danger' | 'success' | 'muted'>> = {
  'auth.login': 'success',
  'auth.login_failed': 'warning',
  'auth.login_blocked': 'danger',
  'security.access_denied': 'danger',
  'security.emergency_signout': 'danger',
  'security.royal_granted': 'warning',
  'security.royal_revoked': 'warning',
  'user.delete': 'danger',
  'program.delete': 'danger',
  'user.password_reset': 'warning',
  'user.sessions_revoked': 'warning',
  'certificate.revoke': 'danger',
  'user.create': 'primary',
  'user.import': 'primary',
  'certificate.issue': 'primary',
};

function href(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/admin/security/audit?${s}` : '/admin/security/audit';
}

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const me = await requireRoyal();
  const sp = await searchParams;
  const { q, clean } = parseAuditQuery(sp);

  const rows = await listAudit(me.orgId, { ...q, before: sp.before, limit: PAGE });
  const names = await getUserNames(me.orgId, [...rows.flatMap((r) => r.targetIds.slice(0, 3)), ...(clean.user ? [clean.user] : [])]);
  const filteredUser = clean.user ? names.get(clean.user) : undefined;
  const anyFilter = Object.values(clean).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/security', label: 'Security' }}
        eyebrow="Royal admin"
        title="Audit log"
        subtitle={`Every sign-in and every change · times in ${timeZoneLabel()} · kept 13 months · signed entries`}
        actions={
          <a href={`/admin/security/export?${new URLSearchParams(Object.entries(clean).filter(([, v]) => v) as [string, string][]).toString()}`} className="btn-outline inline-flex items-center gap-2 h-10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </a>
        }
      />

      <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[200px_200px_1fr_150px_150px_150px_auto]">
        {clean.user && <input type="hidden" name="user" value={clean.user} />}
        <select className="input h-10" name="group" defaultValue={clean.group ?? ''} aria-label="Category">
          <option value="">All categories</option>
          {AUDIT_GROUPS.map((g) => (
            <option key={g.prefix} value={g.prefix}>{g.label}</option>
          ))}
        </select>
        <select className="input h-10" name="action" defaultValue={clean.action ?? ''} aria-label="Event">
          <option value="">All events</option>
          {Object.entries(AUDIT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <input className="input h-10" name="q" defaultValue={clean.q ?? ''} placeholder="Search text, email, name" maxLength={80} aria-label="Search" />
        <input className="input h-10 font-mono text-xs" name="ip" defaultValue={clean.ip ?? ''} placeholder="IP address" aria-label="IP" />
        <input className="input h-10" type="date" name="from" defaultValue={clean.from ?? ''} aria-label="From date" />
        <input className="input h-10" type="date" name="to" defaultValue={clean.to ?? ''} aria-label="To date" />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary h-10 px-4">Filter</button>
          {anyFilter && <Link href="/admin/security/audit" className="btn-outline h-10 px-3 inline-flex items-center">Reset</Link>}
        </div>
      </form>

      {clean.user && (
        <p className="text-sm">
          Events for{' '}
          <Link className="font-medium underline" href={`/admin/users/${clean.user}`}>
            {filteredUser ? `${filteredUser.name} (${filteredUser.email})` : 'a deleted user'}
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote icon={Icons.clock} title="Nothing matches." text="Try a wider date range or fewer filters." />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-bg border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">By</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium" title="Signature check">✓</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const targets = r.targetIds.slice(0, 3).map((id) => ({ id, u: names.get(id) }));
                  return (
                    <tr key={r.id} className={`align-top ${r.integrity === 'tampered' ? 'bg-danger/5' : ''}`}>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap tabular-nums">{formatDateTime(r.at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={href({ ...clean, action: r.action, group: undefined })}>
                          <Badge tone={TONE[r.action] ?? 'muted'}>{r.label}</Badge>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.actorId ? (
                          <Link className="hover:underline" title={r.actorEmail} href={href({ user: r.actorId })}>
                            {r.actorName || r.actorEmail || '—'}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[440px]">
                        {targets.length > 0 && !(r.action === 'auth.login' && r.actorId === r.targetIds[0]) && (
                          <p className="mb-0.5">
                            {targets.map((t, i) => (
                              <span key={t.id}>
                                {i > 0 && ', '}
                                {t.u ? (
                                  <Link className="underline" href={href({ user: t.id })}>{t.u.name}</Link>
                                ) : (
                                  <span className="text-muted">deleted user</span>
                                )}
                              </span>
                            ))}
                            {r.targetIds.length > 3 && <span className="text-muted"> +{r.targetIds.length - 3} more</span>}
                          </p>
                        )}
                        {r.summary && <p className="text-muted break-words">{r.summary}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" title={r.userAgent}>
                        {r.ip ? (
                          <Link className="font-mono text-muted hover:underline" href={href({ ip: r.ip })}>{r.ip}</Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.integrity === 'valid' && <span className="text-success" title="Signature verified">✓</span>}
                        {r.integrity === 'unsigned' && <span className="text-muted" title="Written before signing was added">–</span>}
                        {r.integrity === 'tampered' && <span className="text-danger font-semibold" title="Changed outside the app">tampered</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length === PAGE && (
        <div className="flex justify-end">
          <Link className="btn-outline h-10 px-4 inline-flex items-center" href={href({ ...clean, before: rows[rows.length - 1].at })}>
            Older →
          </Link>
        </div>
      )}
    </div>
  );
}
