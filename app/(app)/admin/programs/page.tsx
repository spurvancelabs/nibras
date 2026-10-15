// =============================================================================
// FILE: app/(app)/admin/programs/page.tsx
// Programs list (admin).
// NEW: overview tiles, search (?q=), status filter (?status=), sort (?sort=).
// Filtering runs on the result of listPrograms() — no DB changes.
// =============================================================================

import Link from 'next/link';
import { requireRole } from '@/lib/auth-helpers';
import { listPrograms } from '@/lib/programs';
import { PageHeader, Badge, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Status = 'draft' | 'active' | 'archived';
type SortKey = 'name' | 'students' | 'mentors';

const STATUS_TONE: Record<string, 'success' | 'muted' | 'warning'> = {
  active: 'success',
  archived: 'muted',
  draft: 'warning',
};

const STATUS_BAR: Record<string, string> = {
  active: 'bg-success',
  archived: 'bg-muted',
  draft: 'bg-warning',
};

function buildHref(params: { q?: string; status?: string; sort?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.status) sp.set('status', params.status);
  if (params.sort && params.sort !== 'name') sp.set('sort', params.sort);
  const s = sp.toString();
  return s ? `/admin/programs?${s}` : '/admin/programs';
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const admin = await requireRole('admin');
  const programs = await listPrograms(admin.orgId);
  const sp = await searchParams;

  const q = (sp.q ?? '').trim();
  const status: Status | undefined =
    sp.status === 'draft' || sp.status === 'active' || sp.status === 'archived'
      ? sp.status
      : undefined;
  const sort: SortKey =
    sp.sort === 'students' || sp.sort === 'mentors' ? sp.sort : 'name';

  // Counts for tiles / tabs (always from the full list)
  const counts = {
    all: programs.length,
    active: programs.filter((p) => p.status === 'active').length,
    draft: programs.filter((p) => p.status === 'draft').length,
    archived: programs.filter((p) => p.status === 'archived').length,
  };
  const totalStudents = programs.reduce((n, p) => n + (p.studentCount ?? 0), 0);
  const totalMentors = programs.reduce((n, p) => n + (p.mentorCount ?? 0), 0);

  // Filter + sort
  const needle = q.toLowerCase();
  const visible = programs
    .filter((p) => !status || p.status === status)
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? '').toLowerCase().includes(needle)
    )
    .sort((a, b) => {
      if (sort === 'students') return (b.studentCount ?? 0) - (a.studentCount ?? 0);
      if (sort === 'mentors') return (b.mentorCount ?? 0) - (a.mentorCount ?? 0);
      return a.name.localeCompare(b.name);
    });

  const tabs: { key?: Status; label: string; count: number }[] = [
    { key: undefined, label: 'All', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'draft', label: 'Draft', count: counts.draft },
    { key: 'archived', label: 'Archived', count: counts.archived },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Programs"
        subtitle={`${programs.length} total`}
        actions={
          <Link href="/admin/programs/new" className="btn-primary inline-flex items-center gap-2 h-10">
            {Icons.plus}
            New program
          </Link>
        }
      />

      {/* Overview tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile label="Programs" value={counts.all} icon={Icons.programs} />
        <Tile label="Active" value={counts.active} icon={Icons.check} />
        <Tile label="Mentor seats" value={totalMentors} icon={Icons.mentor} />
        <Tile label="Student seats" value={totalStudents} icon={Icons.student} />
      </div>

      {/* Toolbar: tabs + search + sort */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <nav
          aria-label="Filter by status"
          className="flex overflow-x-auto p-1 rounded-[var(--radius-md)] bg-surface border border-border self-start max-w-full"
        >
          {tabs.map((t) => {
            const active = status === t.key;
            return (
              <Link
                key={t.label}
                href={buildHref({ q, status: t.key, sort })}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 h-9 px-3.5 inline-flex items-center gap-2 rounded-[calc(var(--radius-md)-2px)] text-sm font-medium transition ${
                  active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
                }`}
              >
                {t.label}
                <span className={`text-[11px] tabular-nums ${active ? 'opacity-80' : 'opacity-70'}`}>
                  {t.count}
                </span>
              </Link>
            );
          })}
        </nav>

        <form action="/admin/programs" method="get" className="flex flex-col sm:flex-row gap-2 lg:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1 sm:w-72">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search programs…"
              aria-label="Search programs"
              className="input h-10 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select name="sort" defaultValue={sort} aria-label="Sort" className="input h-10 sm:w-40">
              <option value="name">Sort: Name</option>
              <option value="students">Most students</option>
              <option value="mentors">Most mentors</option>
            </select>
            <button type="submit" className="btn-outline h-10 px-4">Apply</button>
          </div>
        </form>
      </div>

      {/* Results */}
      {programs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.programs}
            title="No programs yet."
            text="Create your first one to get started."
            action={
              <Link href="/admin/programs/new" className="btn-primary text-sm">
                Create program
              </Link>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.programs}
            title="No programs match your filters."
            action={
              <Link href="/admin/programs" className="btn-outline text-sm">
                Clear filters
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {(q || status) && (
            <p className="text-xs text-muted">
              Showing {visible.length} of {programs.length}
              {q && <> matching “<span className="text-text">{q}</span>”</>}
            </p>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((p) => (
              <Link
                key={p.id}
                href={`/admin/programs/${p.id}`}
                className="group relative flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden hover:border-primary hover:-translate-y-0.5 transition"
              >
                <span aria-hidden className={`h-1 w-full ${STATUS_BAR[p.status] ?? 'bg-border'}`} />
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] bg-hero text-sm font-semibold uppercase">
                        {p.name.trim().slice(0, 2)}
                      </span>
                      <h3 className="font-semibold leading-snug line-clamp-2">{p.name}</h3>
                    </div>
                    <Badge tone={STATUS_TONE[p.status] ?? 'muted'} dot>{p.status}</Badge>
                  </div>

                  <p className="mt-3 mb-4 text-sm text-muted line-clamp-2 min-h-[2.5rem]">
                    {p.description || 'No description.'}
                  </p>

                  <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-border">
                    <div className="flex gap-4 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-muted">{Icons.mentor}</span>
                        <span className="font-medium tabular-nums">{p.mentorCount}</span>
                        <span className="text-muted">mentors</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-muted">{Icons.student}</span>
                        <span className="font-medium tabular-nums">{p.studentCount}</span>
                        <span className="text-muted">students</span>
                      </span>
                    </div>
                    <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                      Manage →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className="grid place-items-center w-9 h-9 rounded-[var(--radius-md)] bg-hero">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}