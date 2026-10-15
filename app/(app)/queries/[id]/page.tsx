// =============================================================================
// FILE: app/(app)/queries/[id]/page.tsx
// Query thread: header, people strip with status actions, chat-style
// messages, reply composer. Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import {
  getQuery,
  listMessages,
  canViewQuery,
} from '@/lib/queries';
import Avatar from '@/components/Avatar';
import ReplyForm from './ReplyForm';
import StatusActions from './StatusActions';
import { Badge, DownloadIcon, Icons } from '@/components/ui';

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

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/queries"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All queries
      </Link>

      {/* ---------------- Header ---------------- */}
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="relative bg-hero px-5 py-6 sm:px-7">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 rounded-full bg-accent opacity-60" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              {query.status === 'resolved' ? (
                <Badge tone="success" dot>resolved</Badge>
              ) : (
                <Badge tone="warning" dot>open</Badge>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface/80 text-[11px] font-medium">
                {query.programName}
              </span>
              {query.sessionId && (
                <Link
                  href={`/sessions/${query.sessionId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface/80 text-[11px] font-medium hover:bg-surface transition"
                >
                  {Icons.calendar}
                  View session
                </Link>
              )}
            </div>
            <h1 className="mt-3 text-xl sm:text-3xl font-semibold tracking-tight break-words">
              {query.subject}
            </h1>
          </div>
        </div>

        {/* People + actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-4 min-w-0 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={query.studentName} size={34} />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted">Asked by</p>
                <p className="text-sm font-medium truncate">{query.studentName}</p>
              </div>
            </div>
            {query.assignedMentorName && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={query.assignedMentorName} size={34} />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Assigned mentor</p>
                    <p className="text-sm font-medium truncate">{query.assignedMentorName}</p>
                  </div>
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
      </section>

      {/* ---------------- Messages ---------------- */}
      <section aria-label="Messages" className="space-y-4">
        {messages.map((m, idx) => {
          const mine = m.senderId === user.id;
          const prev = messages[idx - 1];
          const newDay =
            !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          return (
            <div key={m.id} className="space-y-4">
              {newDay && (
                <div className="flex items-center gap-3" aria-hidden>
                  <span className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted">{dayLabel(m.createdAt)}</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
              )}

              <div className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <span className="hidden sm:block shrink-0">
                  <Avatar name={m.senderName} size={32} />
                </span>
                <div
                  className={`max-w-[88%] sm:max-w-[75%] px-4 py-3 shadow-sm ${
                    mine
                      ? 'bg-primary text-primary-fg rounded-[var(--radius-lg)] rounded-br-[4px]'
                      : 'bg-surface border border-border rounded-[var(--radius-lg)] rounded-bl-[4px]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold">
                      {mine ? 'You' : m.senderName}
                    </span>
                    {m.senderRole !== 'student' && (
                      <span
                        className={`px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wide ${
                          mine ? 'bg-primary-fg/15' : 'bg-hero'
                        }`}
                      >
                        {m.senderRole}
                      </span>
                    )}
                    <span className={`text-[11px] ${mine ? 'opacity-70' : 'text-muted'}`}>
                      {fmt(m.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{m.body}</p>

                  {m.attachments.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {m.attachments.map((a, i) => (
                        <li key={i} className="max-w-full">
                          <a
                            href={cloudinaryDownloadUrl(a.url, a.originalName)}
                            className={`inline-flex items-center gap-2 max-w-full px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition ${
                              mine
                                ? 'bg-primary-fg/15 hover:bg-primary-fg/25'
                                : 'bg-hero hover:bg-accent'
                            }`}
                          >
                            {DownloadIcon}
                            <span className="truncate">{a.originalName || 'attachment'}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ---------------- Reply ---------------- */}
      {canReply ? (
        <ReplyForm queryId={query.id} />
      ) : (
        <div className="flex items-center gap-3 px-5 py-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface text-sm text-muted">
          <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-success/10 text-success">
            {Icons.check}
          </span>
          This thread is resolved. Reopen it above to post a reply.
        </div>
      )}
    </div>
  );
}