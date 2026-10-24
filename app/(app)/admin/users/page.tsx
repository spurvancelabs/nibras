// =============================================================================
// FILE: app/(app)/admin/users/page.tsx
// Users list (admin).
// NEW in this version:
//   - filtering / sorting / paging done in the database (no 500-user ceiling;
//     stats are exact counts)
//   - filters: member ID missing/set, never signed in; sort by last sign-in
//   - "Assign member IDs" panel for everyone without one
//   - link to the audit log
// =============================================================================

import Link from 'next/link';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { searchUsers, getUserStats, type UserSort } from '@/lib/users';
import { listPrograms } from '@/lib/programs';
import { getSettings } from '@/lib/settings';
import { ROLES } from '@/models/User';
import { PageHeader, Icons, Alert } from '@/components/ui';
import UsersTable, { type UserRow } from './UsersTable';
import AssignMemberIdsPanel from './AssignMemberIdsPanel';

type SearchParams = Promise<{
  role?: string;
  q?: string;
  status?: string;
  program?: string;
  sort?: string;
  mid?: string;
  signin?: string;
  page?: string;
  denied?: string;
}>;

export const dynamic = 'force-dynamic';

const SORTS: UserSort[] = ['newest', 'oldest', 'name', 'memberId', 'lastLogin'];

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
  const programId = /^[a-f0-9]{24}$/i.test(sp.program ?? '') ? sp.program : undefined;
  const sort: UserSort = SORTS.includes(sp.sort as UserSort) ? (sp.sort as UserSort) : 'newest';
  const mid = sp.mid === 'missing' || sp.mid === 'set' ? sp.mid : undefined;
  const signin = sp.signin === 'never' || sp.signin === 'ever' ? sp.signin : undefined;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, stats, programs, settings, viewerRoyal] = await Promise.all([
    searchUsers(
      admin.orgId,
      { role, status, programId, search: q || undefined, memberId: mid, signin },
      { sort, page, pageSize: 100 }
    ),
    getUserStats(admin.orgId),
    listPrograms(admin.orgId),
    getSettings(),
    isRoyal(admin),
  ]);

  const programName = new Map(programs.map((p) => [p.id, p.name]));

  const denied = (sp as { denied?: string }).denied === 'royal';
  const rows: UserRow[] = result.rows.map((u) => ({
    ...u,
    programNames: u.programIds.map((id) => programName.get(id)).filter(Boolean) as string[],
  }));

  const tabs = [
    { key: undefined, label: 'All', count: stats.total },
    { key: 'student', label: 'Students', count: stats.student },
    { key: 'mentor', label: 'Mentors', count: stats.mentor },
    { key: 'admin', label: 'Admins', count: stats.admin },
  ] as const;

  const base = {
    q: q || undefined,
    status,
    program: programId,
    sort: sort === 'newest' ? undefined : sort,
    mid,
    signin,
  };
  const filtered = !!(q || status || programId || sort !== 'newest' || mid || signin);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle={`${stats.total} accounts${settings.memberIdRequired ? ' · member ID required' : ''}`}
        actions={
          <>
            {viewerRoyal && (
              <Link href="/admin/security" className="btn-outline inline-flex items-center gap-2 h-10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Security
              </Link>
            )}
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

      {denied && (
        <Alert>That page is for royal admins only. Ask a royal admin if you need access.</Alert>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Total" value={stats.total} icon={Icons.users} />
        <Tile label="Students" value={stats.student} icon={Icons.student} href={buildHref({ role: 'student' })} />
        <Tile label="Disabled" value={stats.disabled} icon={Icons.check} href={buildHref({ ...base, role, status: 'disabled' })} />
        <Tile
          label="Never signed in"
          value={stats.neverSignedIn}
          icon={Icons.mentor}
          href={buildHref({ ...base, role, signin: 'never' })}
          hint="Counted from when sign-in tracking was added"
        />
        <Tile
          label="No member ID"
          value={stats.noMemberId}
          icon={Icons.clipboard}
          href={buildHref({ ...base, role, mid: 'missing' })}
          warn={settings.memberIdRequired && stats.noMemberId > 0}
        />
      </div>

      {stats.noMemberId > 0 && (
        <AssignMemberIdsPanel
          missingCount={stats.noMemberId}
          missingByRole={stats.noMemberIdByRole}
          defaultFormat={settings.memberIdFormat}
          required={settings.memberIdRequired}
        />
      )}

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

        <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_140px_180px_150px_150px_160px_auto]">
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
              maxLength={100}
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
          <select className="input h-10" name="mid" defaultValue={mid ?? ''} aria-label="Member ID">
            <option value="">Any member ID</option>
            <option value="missing">No member ID</option>
            <option value="set">Has member ID</option>
          </select>
          <select className="input h-10" name="signin" defaultValue={signin ?? ''} aria-label="Sign-in">
            <option value="">Any sign-in</option>
            <option value="never">Never signed in</option>
            <option value="ever">Has signed in</option>
          </select>
          <select className="input h-10" name="sort" defaultValue={sort} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="memberId">Member ID</option>
            <option value="lastLogin">Last sign-in</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary h-10 px-4 flex-1 lg:flex-none">Apply</button>
            {filtered && (
              <Link href={buildHref({ role })} className="btn-outline h-10 px-3 inline-flex items-center">
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      <UsersTable
        rows={rows}
        currentUserId={admin.id}
        memberIdFormat={settings.memberIdFormat}
        totalMatching={result.total}
        viewerRoyal={viewerRoyal}
      />

      {result.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            {(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} of {result.total}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link className="btn-outline h-9 px-3 inline-flex items-center" href={buildHref({ ...base, role, page: String(result.page - 1) })}>
                ← Previous
              </Link>
            ) : (
              <span className="btn-outline h-9 px-3 inline-flex items-center opacity-40">← Previous</span>
            )}
            {result.page < result.pages ? (
              <Link className="btn-outline h-9 px-3 inline-flex items-center" href={buildHref({ ...base, role, page: String(result.page + 1) })}>
                Next →
              </Link>
            ) : (
              <span className="btn-outline h-9 px-3 inline-flex items-center opacity-40">Next →</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  href,
  warn = false,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  warn?: boolean;
  hint?: string;
}) {
  const inner = (
    <div
      title={hint}
      className={`h-full p-4 bg-surface border rounded-[var(--radius-lg)] transition ${warn ? 'border-warning' : 'border-border'} ${href ? 'hover:border-primary' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={`grid place-items-center w-8 h-8 rounded-[var(--radius-md)] ${warn ? 'bg-warning/15 text-warning' : 'bg-hero'}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString('en-US')}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
