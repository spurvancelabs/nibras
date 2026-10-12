import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listPrograms } from '@/lib/programs';
import { listUsers } from '@/lib/users';
import { listUpcomingForUser } from '@/lib/sessions';
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

  const [programs, allUsers, upcoming] = await Promise.all([
    listPrograms(user.orgId),
    user.role === 'admin' ? listUsers(user.orgId) : Promise.resolve([]),
    listUpcomingForUser(user.orgId, user, 5),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted capitalize">{user.role} dashboard</p>
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

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Upcoming sessions</h2>
          <Link href="/sessions" className="text-sm text-muted hover:underline">
            View all
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => (
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