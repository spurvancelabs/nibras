import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listQueries } from '@/lib/queries';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

function fmtRelative(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function QueriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireAuth();
  const sp = await searchParams;
  const status = sp.status === 'open' || sp.status === 'resolved' ? sp.status : undefined;

  const queries = await listQueries(user.orgId, user, { status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Queries</h1>
          <p className="text-sm text-muted">
            {queries.length} thread{queries.length === 1 ? '' : 's'}
          </p>
        </div>
        {user.role === 'student' && (
          <Link href="/queries/new" className="btn-primary">
            + New query
          </Link>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide mr-2">
          Filter
        </span>
        <Link
          href="/queries"
          className={!status ? 'btn-primary text-sm' : 'btn-outline text-sm'}
        >
          All
        </Link>
        <Link
          href="/queries?status=open"
          className={status === 'open' ? 'btn-primary text-sm' : 'btn-outline text-sm'}
        >
          Open
        </Link>
        <Link
          href="/queries?status=resolved"
          className={status === 'resolved' ? 'btn-primary text-sm' : 'btn-outline text-sm'}
        >
          Resolved
        </Link>
      </div>

      {queries.length === 0 ? (
        <div className="card text-center text-sm text-muted py-10">
          {user.role === 'student'
            ? 'No queries yet. Ask a mentor a question to get started.'
            : 'No query threads yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {queries.map((q) => (
            <Link
              key={q.id}
              href={`/queries/${q.id}`}
              className="card block hover:border-primary transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium truncate">{q.subject}</h3>
                    {q.status === 'resolved' ? (
                      <span className="badge-success">resolved</span>
                    ) : (
                      <span className="badge-warning">open</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {q.programName}
                    {q.sessionId && ' · session thread'}
                  </p>
                  {q.lastMessagePreview && (
                    <p className="text-sm mt-1.5 line-clamp-2 text-muted">
                      {q.lastMessagePreview}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Avatar name={q.studentName} src={q.studentAvatar} size={18} />
                    <span className="text-xs text-muted">{q.studentName}</span>
                    {q.assignedMentorName && (
                      <>
                        <span className="text-xs text-muted">→</span>
                        <Avatar
                          name={q.assignedMentorName}
                          src={q.assignedMentorAvatar ?? ''}
                          size={18}
                        />
                        <span className="text-xs text-muted">
                          {q.assignedMentorName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted text-right shrink-0">
                  <p>{q.messageCount} msg</p>
                  <p>{fmtRelative(q.lastMessageAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}