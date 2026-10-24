// =============================================================================
// FILE: app/(app)/admin/security/page.tsx   (NEW FILE)
// Security dashboard — royal admins only.
// Sign-in activity, failed / blocked sign-ins (by account and IP), denied
// access attempts, admin accounts, audit-log integrity, recent privileged
// changes and the emergency sign-out switch.
// =============================================================================

import Link from 'next/link';
import { requireRoyal } from '@/lib/auth-helpers';
import { orgHasRoyal } from '@/lib/royal';
import { getSecurityStats, listAudit } from '@/lib/audit';
import { listAdmins } from '@/lib/users';
import { formatDateTime, formatRelative, timeZoneLabel } from '@/lib/time';
import { PageHeader, Panel, PanelLink, Badge, Alert, EmptyNote, Icons } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { ClaimRoyal, EmergencySignOut } from './SecurityControls';

export const dynamic = 'force-dynamic';

const shield = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default async function SecurityPage() {
  const me = await requireRoyal();
  const [hasRoyal, stats, admins, privileged] = await Promise.all([
    orgHasRoyal(me.orgId),
    getSecurityStats(me.orgId),
    listAdmins(me.orgId),
    listAudit(me.orgId, { group: 'security.|user.|settings.|program.|certificate.', limit: 12 }),
  ]);

  const tiles = [
    { label: 'Sign-ins (24h)', value: stats.window24h.logins, tone: '' },
    { label: 'Failed (24h)', value: stats.window24h.failed, tone: stats.window24h.failed > 20 ? 'warn' : '' },
    { label: 'Blocked (24h)', value: stats.window24h.blocked, tone: stats.window24h.blocked ? 'danger' : '' },
    { label: 'Access denied (24h)', value: stats.window24h.denied, tone: stats.window24h.denied ? 'warn' : '' },
    { label: 'Distinct IPs (24h)', value: stats.window24h.uniqueIps, tone: '' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Royal admin"
        title="Security"
        subtitle={`Sign-in activity, admin accounts and the audit trail · times in ${timeZoneLabel()}`}
        actions={
          <>
            <Link href="/admin/security/audit" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.clock} Full audit log
            </Link>
          </>
        }
      />

      {!hasRoyal && (
        <section className="rounded-[var(--radius-lg)] border border-warning/60 bg-warning/5 p-5 space-y-3">
          <h2 className="font-semibold">No royal admin yet</h2>
          <p className="text-sm text-muted max-w-2xl">
            Until a royal admin exists, <b>every admin</b> has royal powers (that&apos;s how the LMS worked before).
            Make yourself the royal admin to restrict admin management and these logs to royal admins only.
            You can also set <code>ROYAL_ADMIN_EMAILS</code> on the server.
          </p>
          <ClaimRoyal />
        </section>
      )}

      {!stats.signingEnabled && (
        <Alert>Audit entries are not being signed because AUTH_SECRET / NEXTAUTH_SECRET is missing on the server.</Alert>
      )}
      {stats.integrity.tampered > 0 && (
        <Alert>
          <b>{stats.integrity.tampered}</b> recent audit entr{stats.integrity.tampered === 1 ? 'y has' : 'ies have'} a signature that
          doesn&apos;t match — they were changed outside the app. Investigate database access.
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`p-4 bg-surface border rounded-[var(--radius-lg)] ${
              t.tone === 'danger' ? 'border-danger/60' : t.tone === 'warn' ? 'border-warning/60' : 'border-border'
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{t.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted -mt-3">
        Last 7 days: {stats.window7d.logins} sign-ins · {stats.window7d.failed} failed · {stats.window7d.blocked} blocked ·{' '}
        {stats.window7d.denied} access denied
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Most failed sign-ins (7 days) — accounts" icon={shield} bodyClassName="p-0">
          {stats.topFailedAccounts.length === 0 ? (
            <EmptyNote compact title="No failed sign-ins." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.topFailedAccounts.map((r) => (
                <li key={r.email} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <Link className="truncate hover:underline" href={`/admin/security/audit?q=${encodeURIComponent(r.email)}&group=auth.`}>
                    {r.email}
                  </Link>
                  <span className="text-xs text-muted shrink-0 tabular-nums">
                    {r.count}× · {formatRelative(r.lastAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Most failed sign-ins (7 days) — IP addresses" icon={shield} bodyClassName="p-0">
          {stats.topFailedIps.length === 0 ? (
            <EmptyNote compact title="No failed sign-ins." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.topFailedIps.map((r) => (
                <li key={r.ip} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <Link className="font-mono text-xs hover:underline" href={`/admin/security/audit?ip=${encodeURIComponent(r.ip)}`}>
                    {r.ip}
                  </Link>
                  <span className="text-xs text-muted shrink-0 tabular-nums">
                    {r.count}× · {formatRelative(r.lastAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={`Admin accounts (${admins.length})`} icon={Icons.users} bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3">
              <Link href={`/admin/users/${a.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                <Avatar name={a.name} src={a.avatar} size={34} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate group-hover:underline">
                    {a.name} {a.id === me.id && <span className="text-[10px] text-muted">(you)</span>}
                  </span>
                  <span className="block text-xs text-muted truncate">{a.email}</span>
                </span>
              </Link>
              <span className="flex flex-wrap items-center gap-1.5">
                {a.royal && <Badge tone="warning">👑 royal{a.royalFromEnv ? ' (server)' : ''}</Badge>}
                {a.status === 'disabled' ? <Badge tone="danger" dot>disabled</Badge> : <Badge tone="success" dot>active</Badge>}
                <span className="text-xs text-muted" title={a.lastLoginAt ? formatDateTime(a.lastLoginAt) : undefined}>
                  {a.lastLoginAt ? `signed in ${formatRelative(a.lastLoginAt)}` : 'never signed in'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Recent privileged changes"
        icon={Icons.edit}
        action={<PanelLink href="/admin/security/audit?group=security.|user.|settings.|program.|certificate.">All</PanelLink>}
        bodyClassName="p-0"
      >
        {privileged.length === 0 ? (
          <EmptyNote compact title="Nothing yet." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {privileged.map((r) => (
              <li key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="text-xs text-muted w-40 shrink-0 tabular-nums">{formatDateTime(r.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.label}</span>
                  {r.summary && <span className="text-muted"> — {r.summary}</span>}
                </span>
                <span className="text-xs text-muted truncate">{r.actorName || r.actorEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Audit log integrity" icon={shield}>
          <p className="text-sm">
            Checked the latest <b>{stats.integrity.checked}</b> entries: <b className="text-success">{stats.integrity.valid}</b> verified
            {stats.integrity.unsigned > 0 && <> · {stats.integrity.unsigned} unsigned (written before signing was added)</>}
            {stats.integrity.tampered > 0 && <> · <b className="text-danger">{stats.integrity.tampered} tampered</b></>}.
          </p>
          <p className="text-xs text-muted mt-2">
            Each entry is signed with a key derived from the server secret. Editing an entry directly in the database
            breaks its signature.
          </p>
        </Panel>
        <Panel title="Emergency sign-out" icon={shield}>
          <p className="text-sm text-muted mb-3">
            Signs out <b>every account</b> on every device (except you). Use it if you think a password or device was
            compromised. Nobody&apos;s password changes.
          </p>
          <EmergencySignOut />
        </Panel>
      </div>
    </div>
  );
}
