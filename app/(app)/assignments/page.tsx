import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listAssignments } from '@/lib/assignments';
import type { SubmissionState } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StateBadge({ state }: { state: SubmissionState }) {
  if (state === 'graded') return <span className="badge-success">graded</span>;
  if (state === 'submitted') return <span className="badge-muted">submitted</span>;
  if (state === 'overdue') return <span className="badge-danger">overdue</span>;
  return <span className="badge-warning">pending</span>;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-muted">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        {canCreate && (
          <Link href="/assignments/new" className="btn-primary">
            + New assignment
          </Link>
        )}
      </div>

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
      />
    </div>
  );
}

function Section({
  title,
  list,
  empty,
  role,
}: {
  title: string;
  list: Awaited<ReturnType<typeof listAssignments>>;
  empty: string;
  role: 'admin' | 'mentor' | 'student';
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
        {title}
      </h2>
      {list.length === 0 ? (
        <div className="card text-sm text-muted">{empty}</div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Link
              key={a.id}
              href={`/assignments/${a.id}`}
              className="card flex items-start justify-between gap-4 hover:border-primary transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-medium truncate">{a.title}</h3>
                  {role === 'student' && a.myState && (
                    <StateBadge state={a.myState} />
                  )}
                  <span className="text-xs text-muted">
                    {a.maxMarks} marks
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {a.programName} · Due {fmtDate(a.dueAt)}
                </p>
              </div>

              {role !== 'student' && (
                <div className="text-xs text-muted text-right shrink-0">
                  <p>
                    {a.submittedCount}/{a.totalStudents} submitted
                  </p>
                  <p>{a.gradedCount} graded</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}