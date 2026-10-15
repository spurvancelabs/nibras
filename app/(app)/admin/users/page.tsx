// =============================================================================
// FILE: app/(app)/admin/users/page.tsx
// Users list (admin).
// NEW: stat tiles, role tabs, search (name / email / member ID), status +
//      program filters, sort, and a client table with bulk actions
//      (activate / disable / change role / delete) and CSV export.
// =============================================================================

import Link from 'next/link';
import { requireRole } from '@/lib/auth-helpers';
import { listUsers } from '@/lib/users';
import { listPrograms } from '@/lib/programs';
import { getSettings } from '@/lib/settings';
import { ROLES } from '@/models/User';
import { PageHeader, Icons } from '@/components/ui';
import UsersTable, { type UserRow } from './UsersTable';

type SearchParams = Promise<{
  role?: string;
  q?: string;
  status?: string;
  program?: string;
  sort?: string;
}>;

export const dynamic = 'force-dynamic';

function buildHref(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/admin/users?${s}` : '/admin/users';
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireRole('admin');
  const sp = await searchParams;

  const role = ROLES.includes(sp.role as (typeof ROLES)[number])
    ? (sp.role as (typeof ROLES)[number])
    : undefined;
  const status = sp.status === 'active' || sp.status === 'disabled' ? sp.status : undefined;
  const programId = sp.program || undefined;
  const sort = sp.sort === 'name' || sp.sort === 'oldest' || sp.sort === 'memberId' ? sp.sort : 'newest';
  const q = (sp.q ?? '').trim();

  const [allUsers, users, programs, settings] = await Promise.all([
    listUsers(admin.orgId),
    listUsers(admin.orgId, { role, search: q || undefined }),
    listPrograms(admin.orgId),
    getSettings(),
  ]);

  const programName = new Map(programs.map((p) => [p.id, p.name]));

  // Stats (always from the full list)
  const stats = {
    total: allUsers.length,
    admin: allUsers.filter((u) => u.role === 'admin').length,
    mentor: allUsers.filter((u) => u.role === 'mentor').length,
    student: allUsers.filter((u) => u.role === 'student').length,
    disabled: allUsers.filter((u) => u.status === 'disabled').length,
    noMemberId: allUsers.filter((u) => !u.memberId).length,
  };

  const visible = users
    .filter((u) => !status || u.status === status)
    .filter((u) => !programId || u.programIds.includes(programId))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt);
      if (sort === 'memberId') return (a.memberId || '~').localeCompare(b.memberId || '~');
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

  const rows: UserRow[] = visible.map((u) => ({
    ...u,
    programNames: u.programIds.map((id) => programName.get(id)).filter(Boolean) as string[],
  }));

  const tabs = [
    { key: undefined, label: 'All', count: stats.total },
    { key: 'student', label: 'Students', count: stats.student },
    { key: 'mentor', label: 'Mentors', count: stats.mentor },
    { key: 'admin', label: 'Admins', count: stats.admin },
  ] as const;

  const base = { q: q || undefined, status, program: programId, sort: sort === 'newest' ? undefined : sort };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle={`${stats.total} accounts${settings.memberIdRequired ? ' · member ID required' : ''}`}
        actions={
          <>
            <Link href="/admin/users/import" className="btn-outline inline-flex items-center gap-2 h-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Import CSV
            </Link>
            <Link href="/admin/users/new" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.plus}
              New user
            </Link>
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Total" value={stats.total} icon={Icons.users} />
        <Tile label="Students" value={stats.student} icon={Icons.student} />
        <Tile label="Mentors" value={stats.mentor} icon={Icons.mentor} />
        <Tile label="Disabled" value={stats.disabled} icon={Icons.check} href={buildHref({ ...base, role, status: 'disabled' })} />
        <Tile label="No member ID" value={stats.noMemberId} icon={Icons.clipboard} warn={settings.memberIdRequired && stats.noMemberId > 0} />
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <nav
          aria-label="Filter by role"
          className="flex overflow-x-auto p-1 rounded-[var(--radius-md)] bg-surface border border-border w-fit max-w-full"
        >
          {tabs.map((t) => {
            const active = role === t.key;
            return (
              <Link
                key={t.label}
                href={buildHref({ ...base, role: t.key })}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 h-9 px-3.5 inline-flex items-center gap-2 rounded-[calc(var(--radius-md)-2px)] text-sm font-medium transition ${
                  active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
                }`}
              >
                {t.label}
                <span className="text-[11px] tabular-nums opacity-75">{t.count}</span>
              </Link>
            );
          })}
        </nav>

        <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_160px_200px_170px_auto]">
          {role && <input type="hidden" name="role" value={role} />}
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="input h-10 pl-9"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, email or member ID"
              aria-label="Search users"
            />
          </div>
          <select className="input h-10" name="status" defaultValue={status ?? ''} aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <select className="input h-10" name="program" defaultValue={programId ?? ''} aria-label="Program">
            <option value="">Any program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input h-10" name="sort" defaultValue={sort} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="memberId">Member ID</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary h-10 px-4 flex-1 lg:flex-none">Apply</button>
            {(q || status || programId || sort !== 'newest') && (
              <Link href={buildHref({ role })} className="btn-outline h-10 px-3 inline-flex items-center">
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      <UsersTable rows={rows} currentUserId={admin.id} />
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  href,
  warn = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  warn?: boolean;
}) {
  const inner = (
    <div className={`h-full p-4 bg-surface border rounded-[var(--radius-lg)] transition ${warn ? 'border-warning' : 'border-border'} ${href ? 'hover:border-primary' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={`grid place-items-center w-8 h-8 rounded-[var(--radius-md)] ${warn ? 'bg-warning/15 text-warning' : 'bg-hero'}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}