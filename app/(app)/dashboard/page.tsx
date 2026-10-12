import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listPrograms } from '@/lib/programs';
import { listUsers } from '@/lib/users';
import { listUpcomingForUser } from '@/lib/sessions';
import { listAssignments } from '@/lib/assignments';
import { listOpenQueries } from '@/lib/queries';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [programs, allUsers, upcomingSessions, assignments, openQueries] =
    await Promise.all([
      listPrograms(user.orgId),
      user.role === 'admin' ? listUsers(user.orgId) : Promise.resolve([]),
      listUpcomingForUser(user.orgId, user, 5),
      listAssignments(user.orgId, user),
      listOpenQueries(user.orgId, user, 5),
    ]);

  const now = Date.now();
  const pendingForStudent =
    user.role === 'student'
      ? assignments
        .filter((a) => a.myState === 'pending' || a.myState === 'overdue')
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
        .slice(0, 5)
      : [];

  const toGradeForMentor =
    user.role === 'mentor' || user.role === 'admin'
      ? assignments
        .filter((a) => a.submittedCount > a.gradedCount)
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
        .slice(0, 5)
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {user.name?.split(' ')[0] ?? user.name}
        </h1>
        <p className="text-sm text-muted capitalize">
          {user.role} · {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {user.role === 'admin' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Programs" value={programs.length} href="/admin/programs" />
          <Stat label="Users" value={allUsers.length} href="/admin/users" />
          <Stat
            label="Mentors"
            value={allUsers.filter((u) => u.role === 'mentor').length}
            href="/admin/users?role=mentor"
          />
          <Stat
            label="Students"
            value={allUsers.filter((u) => u.role === 'student').length}
            href="/admin/users?role=student"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming sessions</h2>
            <Link href="/sessions" className="text-sm text-muted hover:underline">
              View all
            </Link>
          </div>

          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-bg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted">
                      {s.programName} · {fmt(s.startsAt)}
                    </p>
                  </div>
                  <Avatar name={s.mentorName} src={s.mentorAvatar} size={24} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              {user.role === 'student' ? 'Your assignments' : 'To grade'}
            </h2>
            <Link href="/assignments" className="text-sm text-muted hover:underline">
              View all
            </Link>
          </div>

          {user.role === 'student' ? (
            pendingForStudent.length === 0 ? (
              <p className="text-sm text-muted">Nothing pending. 🎉</p>
            ) : (
              <div className="space-y-2">
                {pendingForStudent.map((a) => {
                  const overdue = a.myState === 'overdue';
                  return (
                    <Link
                      key={a.id}
                      href={`/assignments/${a.id}`}
                      className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-bg"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p
                          className={`text-xs ${overdue ? 'text-danger' : 'text-muted'
                            }`}
                        >
                          {a.programName} · Due {fmt(a.dueAt)}
                        </p>
                      </div>
                      <span
                        className={
                          overdue ? 'badge-danger' : 'badge-warning'
                        }
                      >
                        {a.myState}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )
          ) : toGradeForMentor.length === 0 ? (
            <p className="text-sm text-muted">Nothing to grade.</p>
          ) : (
            <div className="space-y-2">
              {toGradeForMentor.map((a) => (
                <Link
                  key={a.id}
                  href={`/assignments/${a.id}`}
                  className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-bg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.programName} · {a.submittedCount - a.gradedCount} to grade
                    </p>
                  </div>
                  <span className="badge-warning">
                    {a.submittedCount - a.gradedCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Queries panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {user.role === 'student' ? 'Your open queries' : 'Open queries'}
          </h2>
          <Link href="/queries" className="text-sm text-muted hover:underline">
            View all
          </Link>
        </div>

        {openQueries.length === 0 ? (
          <p className="text-sm text-muted">
            {user.role === 'student'
              ? 'No open threads. Ask a question any time.'
              : 'No open threads needing attention.'}
          </p>
        ) : (
          <div className="space-y-2">
            {openQueries.map((q) => (
              <Link
                key={q.id}
                href={`/queries/${q.id}`}
                className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-bg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{q.subject}</p>
                  <p className="text-xs text-muted truncate">
                    {q.programName} · {q.studentName}
                  </p>
                </div>
                <span className="badge-warning shrink-0">
                  {q.messageCount} msg
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {user.role === 'admin' && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent programs</h2>
            <Link href="/admin/programs" className="text-sm text-muted hover:underline">
              Manage
            </Link>
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-muted">No programs yet.</p>
          ) : (
            <div className="space-y-2">
              {programs.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/programs/${p.id}`}
                  className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-bg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.mentorCount} mentors · {p.studentCount} students
                    </p>
                  </div>
                  <span
                    className={
                      p.status === 'active'
                        ? 'badge-success'
                        : p.status === 'archived'
                          ? 'badge-muted'
                          : 'badge-warning'
                    }
                  >
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="card">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}