import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import {
  getQuery,
  listMessages,
  canViewQuery,
} from '@/lib/queries';
import ReplyForm from './ReplyForm';
import StatusActions from './StatusActions';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function QueryThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const query = await getQuery(user.orgId, id);
  if (!query) notFound();

  const canView = await canViewQuery(user.orgId, user, {
    studentId: query.studentId,
    programId: query.programId,
  });
  if (!canView) notFound();

  const messages = await listMessages(user.orgId, query.id);

  const canReply = query.status === 'open';
  const canManageStatus = true; // students can resolve/reopen their own; mentors/admin theirs

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/queries" className="text-sm text-muted hover:underline">
          ← All queries
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{query.subject}</h1>
          <p className="text-sm text-muted">
            {query.programName}
            {query.sessionId && (
              <>
                {' · '}
                <Link
                  href={`/sessions/${query.sessionId}`}
                  className="hover:underline"
                >
                  view session
                </Link>
              </>
            )}
          </p>
        </div>
        {query.status === 'resolved' ? (
          <span className="badge-success">resolved</span>
        ) : (
          <span className="badge-warning">open</span>
        )}
      </div>

      <div className="card flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-muted">Asked by</p>
            <p className="text-sm font-medium truncate">{query.studentName}</p>
          </div>
          {query.assignedMentorName && (
            <>
              <span className="text-muted">→</span>
              <div className="min-w-0">
                <p className="text-xs text-muted">Assigned mentor</p>
                <p className="text-sm font-medium truncate">
                  {query.assignedMentorName}
                </p>
              </div>
            </>
          )}
        </div>

        <StatusActions
          queryId={query.id}
          status={query.status}
          canManage={canManageStatus}
        />
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`max-w-[80%] rounded-lg border p-3 ${
                  mine
                    ? 'bg-primary text-primary-fg border-transparent'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-medium">
                    {m.senderName}
                    {m.senderRole !== 'student' && (
                      <span className="opacity-70"> · {m.senderRole}</span>
                    )}
                  </span>
                  <span
                    className={`text-xs ${mine ? 'opacity-70' : 'text-muted'}`}
                  >
                    {fmt(m.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>

                {m.attachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {m.attachments.map((a, i) => (
                      <li key={i}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={a.originalName || undefined}
                          className={`text-xs underline ${
                            mine ? 'opacity-90' : 'text-muted'
                          }`}
                        >
                          📎 {a.originalName || 'attachment'}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      {canReply ? (
        <ReplyForm queryId={query.id} />
      ) : (
        <div className="card text-sm text-muted">
          This thread is resolved. Reopen it above to post a reply.
        </div>
      )}
    </div>
  );
}