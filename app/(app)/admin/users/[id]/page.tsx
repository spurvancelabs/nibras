// =============================================================================
// FILE: app/(app)/admin/users/[id]/page.tsx
// Edit-user page (admin): profile header, account form (incl. member ID),
// programs, and a danger zone (delete) that shows what will be removed.
// NEW: last sign-in in the header, dates in the app time zone, and a
// "Recent activity" list from the audit log (sign-ins, changes, resets).
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole, isRoyal, hasPermission } from '@/lib/auth-helpers';
import RoyalToggle from './RoyalToggle';
import ResetTwoFactor from './ResetTwoFactor';
import AccountExtras from './AccountExtras';
import { twoFactorStatus } from '@/lib/two-factor';
import { getUserById, getUserFootprint } from '@/lib/users';
import { listPrograms } from '@/lib/programs';
import { getSettings } from '@/lib/settings';
import { listAudit } from '@/lib/audit';
import { formatDateTime, formatMonthYear, formatRelative } from '@/lib/time';
import Avatar from '@/components/Avatar';
import EditUserForm from './EditUserForm';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole('admin');
  const { id } = await params;

  const [user, programs, settings] = await Promise.all([
    getUserById(admin.orgId, id),
    listPrograms(admin.orgId),
    getSettings(),
  ]);

  if (!user) notFound();

  const viewerRoyal = await isRoyal(admin);
  const [footprint, activity] = await Promise.all([
    getUserFootprint(admin.orgId, user.id),
    viewerRoyal ? listAudit(admin.orgId, { targetId: user.id, limit: 15 }).catch(() => []) : Promise.resolve([]),
  ]);
  const isSelf = user.id === admin.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All users
      </Link>

      {/* Profile header */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 w-52 h-52 rounded-full bg-accent opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.name} src={user.avatar} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={user.role === 'admin' ? 'primary' : user.role === 'mentor' ? 'warning' : 'muted'}>
                {user.role}
              </Badge>
              {user.status === 'active' ? (
                <Badge tone="success" dot>active</Badge>
              ) : (
                <Badge tone="danger" dot>disabled</Badge>
              )}
              {user.royal && <Badge tone="warning">👑 royal admin</Badge>}
              {isSelf && <Badge tone="muted">you</Badge>}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight truncate">{user.name}</h1>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:w-auto">
            <Fact label="Member ID" value={user.memberId || '—'} mono />
            <Fact label="Programs" value={String(user.programIds.length)} />
            <Fact label="Joined" value={formatMonthYear(user.createdAt)} />
            <Fact
              label="Last sign-in"
              value={user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'never'}
              title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}
            />
          </div>
        </div>
      </section>

      <EditUserForm
        user={user}
        programs={programs}
        isSelf={isSelf}
        footprint={footprint}
        memberIdRequired={settings.memberIdRequired}
        memberIdFormat={settings.memberIdFormat}
        viewerRoyal={viewerRoyal}
      />

      {!isSelf && (
        <AccountExtras
          userId={user.id}
          role={user.role}
          status={user.status}
          exempt={user.automationExempt}
          suspendedReason={user.suspendedReason}
          suspendedBy={user.suspendedBy}
          suspendedAt={user.suspendedAt}
          premiumUntil={user.premiumUntil}
          premiumOn={settings.premiumEnabled === true}
          canReview={await hasPermission(admin, 'automation.review')}
        />
      )}

      {viewerRoyal && !isSelf && (
        <ResetTwoFactor userId={user.id} name={user.name} enabled={(await twoFactorStatus(admin.orgId, user.id).catch(() => ({ enabled: false }))).enabled} />
      )}

      {viewerRoyal && user.role === 'admin' && !isSelf && user.status === 'active' && (
        <RoyalToggle userId={user.id} name={user.name} royal={user.royal} fromEnv={user.royalFromEnv} />
      )}

      {/* Recent activity (royal admins only) */}
      {viewerRoyal && (
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Recent activity</h2>
          <Link href={`/admin/security/audit?user=${user.id}`} className="text-xs text-muted hover:text-text underline">
            Full history
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 sm:px-6 py-5 text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((a) => (
              <li key={a.id} className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                <span className="text-xs text-muted w-40 shrink-0 tabular-nums">{formatDateTime(a.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`font-medium ${a.action === 'auth.login_failed' || a.action === 'auth.login_blocked' ? 'text-danger' : ''}`}>
                    {a.label}
                  </span>
                  {a.summary && a.action !== 'auth.login' && (
                    <span className="text-muted"> — {a.summary}</span>
                  )}
                </span>
                <span className="text-xs text-muted truncate">
                  {a.actorId && a.actorId !== user.id ? `by ${a.actorName || a.actorEmail}` : ''}
                  {a.ip ? ` · ${a.ip}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}

function Fact({ label, value, mono = false, title }: { label: string; value: string; mono?: boolean; title?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface/85 border border-border px-3 py-2 min-w-0" title={title}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
