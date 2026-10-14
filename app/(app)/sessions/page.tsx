import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listSessionsForUser } from '@/lib/sessions';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function SessionsPage() {
  const user = await requireAuth();
  const sessions = await listSessionsForUser(user.orgId, user);

  const now = Date.now();
  const upcoming = sessions
    .filter((s) => new Date(s.startsAt).getTime() >= now && s.status === 'scheduled')
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = sessions
    .filter((s) => new Date(s.startsAt).getTime() < now || s.status !== 'scheduled')
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  const canCreate = user.role === 'admin' || user.role === 'mentor';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-muted">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        {canCreate && (
          <Link href="/sessions/new" className="btn-primary">
            + New session
          </Link>
        )}
      </div>

      <Section title="Upcoming" sessions={upcoming} empty="No upcoming sessions." />
      <Section title="Past" sessions={past} empty="No past sessions yet." />
    </div>
  );
}

function Section({
  title,
  sessions,
  empty,
}: {
  title: string;
  sessions: Awaited<ReturnType<typeof listSessionsForUser>>;
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
        {title}
      </h2>
      {sessions.length === 0 ? (
        <div className="card text-sm text-muted">{empty}</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="card flex items-start justify-between gap-4 hover:border-primary transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{s.title}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-muted">
                  {s.programName} · {fmtDate(s.startsAt)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar name={s.mentorName} src={s.mentorAvatar} size={20} />
                  <span className="text-xs text-muted">{s.mentorName}</span>
                </div>
              </div>
              {s.recordingUrl && (
                <span className="badge-muted shrink-0">recording</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-success">completed</span>;
  if (status === 'cancelled') return <span className="badge-danger">cancelled</span>;
  return <span className="badge-muted">scheduled</span>;
}