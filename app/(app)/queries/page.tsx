// =============================================================================
// FILE: app/(app)/queries/page.tsx
// Query threads list with All / Open / Resolved filter (?status=…).
// Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listQueries } from '@/lib/queries';
import Avatar from '@/components/Avatar';
import { PageHeader, Badge, EmptyNote, Icons } from '@/components/ui';
import { formatDate } from '@/lib/time';

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
  return formatDate(iso);
}

const FILTERS = [
  { key: undefined, label: 'All', href: '/queries' },
  { key: 'open', label: 'Open', href: '/queries?status=open' },
  { key: 'resolved', label: 'Resolved', href: '/queries?status=resolved' },
] as const;

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
      <PageHeader
        eyebrow="Support"
        title="Queries"
        subtitle={`${queries.length} thread${queries.length === 1 ? '' : 's'}`}
        actions={
          user.role === 'student' && (
            <Link href="/queries/new" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.plus}
              New query
            </Link>
          )
        }
      />

      {/* Filter tabs */}
      <nav
        aria-label="Filter queries"
        className="inline-flex p-1 rounded-[var(--radius-md)] bg-surface border border-border"
      >
        {FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Link
              key={f.label}
              href={f.href}
              aria-current={active ? 'page' : undefined}
              className={`h-9 px-4 inline-flex items-center rounded-[calc(var(--radius-md)-2px)] text-sm font-medium transition ${
                active
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {queries.length === 0 ? (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
          <EmptyNote
            icon={Icons.chat}
            title={
              user.role === 'student'
                ? 'No queries yet.'
                : 'No query threads yet.'
            }
            text={user.role === 'student' ? 'Ask a mentor a question to get started.' : undefined}
            action={
              user.role === 'student' ? (
                <Link href="/queries/new" className="btn-primary text-sm">
                  Ask a question
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] divide-y divide-border overflow-hidden">
          {queries.map((q) => {
            const resolved = q.status === 'resolved';
            return (
              <Link
                key={q.id}
                href={`/queries/${q.id}`}
                className="flex gap-3 sm:gap-4 px-4 py-4 hover:bg-hero/40 transition"
              >
                <div className="relative shrink-0">
                  <Avatar name={q.studentName} src={q.studentAvatar} size={42} />
                  {!resolved && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-warning ring-2 ring-surface" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`truncate ${resolved ? 'font-medium text-muted' : 'font-semibold'}`}>
                      {q.subject}
                    </h3>
                    <span className="text-xs text-muted shrink-0 tabular-nums">
                      {fmtRelative(q.lastMessageAt)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {resolved ? (
                      <Badge tone="success" dot>resolved</Badge>
                    ) : (
                      <Badge tone="warning" dot>open</Badge>
                    )}
                    <span className="text-xs text-muted truncate">
                      {q.programName}
                      {q.sessionId && ' · session thread'}
                    </span>
                  </div>

                  {q.lastMessagePreview && (
                    <p className="text-sm mt-2 line-clamp-2 text-muted">
                      {q.lastMessagePreview}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-2.5">
                    <div className="flex items-center gap-2 min-w-0 text-xs text-muted">
                      <span className="truncate">{q.studentName}</span>
                      {q.assignedMentorName && (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                          <Avatar
                            name={q.assignedMentorName}
                            src={q.assignedMentorAvatar ?? ''}
                            size={18}
                          />
                          <span className="truncate">{q.assignedMentorName}</span>
                        </>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted shrink-0">
                      {Icons.chat}
                      <span className="tabular-nums">{q.messageCount}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}