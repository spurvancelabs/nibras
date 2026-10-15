// =============================================================================
// FILE: app/(app)/assignments/page.tsx
// Assignments list: upcoming + past. Students see their state; mentors/admins
// see submission progress. Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listAssignments } from '@/lib/assignments';
import type { SubmissionState } from '@/lib/constants';
import { PageHeader, Badge, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

type AssignmentRow = Awaited<ReturnType<typeof listAssignments>>[number];
type ViewerRole = 'admin' | 'mentor' | 'student';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "in 3 days" / "2 hours ago" — display only */
function relative(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const v = mins < 60 ? `${mins}m` : hrs < 48 ? `${hrs}h` : `${days} days`;
  return diff >= 0 ? `in ${v}` : `${v} ago`;
}

function StateBadge({ state }: { state: SubmissionState }) {
  if (state === 'graded') return <Badge tone="success" dot>graded</Badge>;
  if (state === 'submitted') return <Badge tone="muted" dot>submitted</Badge>;
  if (state === 'overdue') return <Badge tone="danger" dot>overdue</Badge>;
  return <Badge tone="warning" dot>pending</Badge>;
}

export default async function AssignmentsPage() {
  const user = await requireAuth();
  const assignments = await listAssignments(user.orgId, user);

  const now = Date.now();
  const upcoming = assignments
    .filter((a) => new Date(a.dueAt).getTime() >= now - 24 * 3600 * 1000)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const past = assignments
    .filter((a) => new Date(a.dueAt).getTime() < now - 24 * 3600 * 1000)
    .sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt));

  const canCreate = user.role === 'admin' || user.role === 'mentor';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learning"
        title="Assignments"
        subtitle={
          <span className="inline-flex flex-wrap gap-2">
            <Badge tone="primary">{upcoming.length} upcoming</Badge>
            <Badge tone="muted">{past.length} past</Badge>
          </span>
        }
        actions={
          canCreate && (
            <Link href="/assignments/new" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.plus}
              New assignment
            </Link>
          )
        }
      />

      <Section
        title="Upcoming"
        list={upcoming}
        empty="No upcoming assignments."
        role={user.role}
      />
      <Section
        title="Past"
        list={past}
        empty="No past assignments yet."
        role={user.role}
        muted
      />
    </div>
  );
}

function Section({
  title,
  list,
  empty,
  role,
  muted = false,
}: {
  title: string;
  list: AssignmentRow[];
  empty: string;
  role: ViewerRole;
  muted?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </h2>
      {list.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote icon={Icons.clipboard} title={empty} />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] divide-y divide-border overflow-hidden">
          {list.map((a) => (
            <AssignmentRowItem key={a.id} a={a} role={role} muted={muted} />
          ))}
        </div>
      )}
    </section>
  );
}

function AssignmentRowItem({
  a,
  role,
  muted,
}: {
  a: AssignmentRow;
  role: ViewerRole;
  muted: boolean;
}) {
  const overdueForStudent = role === 'student' && a.myState === 'overdue';
  const submittedPct =
    a.totalStudents > 0 ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
  const gradedPct =
    a.totalStudents > 0 ? Math.round((a.gradedCount / a.totalStudents) * 100) : 0;

  return (
    <Link
      href={`/assignments/${a.id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-4 py-4 hover:bg-hero/40 transition"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span
          className={`grid place-items-center w-11 h-11 shrink-0 rounded-[var(--radius-md)] ${
            overdueForStudent
              ? 'bg-danger/10 text-danger'
              : muted
              ? 'bg-bg text-muted border border-border'
              : 'bg-hero text-text'
          }`}
        >
          {Icons.clipboard}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate max-w-full">{a.title}</h3>
            {role === 'student' && a.myState && <StateBadge state={a.myState} />}
          </div>
          <p className="mt-0.5 text-xs text-muted truncate">
            {a.programName} · {a.maxMarks} marks
          </p>
          <p className={`mt-1 text-xs inline-flex items-center gap-1.5 ${overdueForStudent ? 'text-danger font-medium' : 'text-muted'}`}>
            {Icons.clock}
            Due {fmtDate(a.dueAt)}
            <span className="opacity-70">· {relative(a.dueAt)}</span>
          </p>
        </div>
      </div>

      {role !== 'student' && (
        <div className="sm:w-56 shrink-0 space-y-1.5 pl-14 sm:pl-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {a.submittedCount}/{a.totalStudents} submitted
            </span>
            <span className="font-medium">{a.gradedCount} graded</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-hero overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${submittedPct}%` }}
            />
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${gradedPct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}