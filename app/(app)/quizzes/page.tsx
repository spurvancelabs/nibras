// =============================================================================
// FILE: app/(app)/quizzes/page.tsx   (NEW FILE)
// Quizzes list. Students: quizzes from their programs with status, attempts and
// best score. Mentors/admins: their programs' quizzes with attempt stats.
// =============================================================================

import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { listQuizzes } from '@/lib/quizzes';
import { getSettings } from '@/lib/settings';
import { formatDateTime, formatRelative } from '@/lib/time';
import { PageHeader, Badge, EmptyNote, Icons } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ program?: string; tab?: string }> }) {
  const user = await requireAuth();
  const sp = await searchParams;
  const settings = await getSettings();
  if (!settings.featureQuizzes) {
    return <EmptyNote title="Quizzes are turned off." text="An admin can turn them on in Settings → Features." />;
  }

  const quizzes = await listQuizzes(user.orgId, user, { programId: sp.program });
  const staff = user.role !== 'student';
  const tab = sp.tab === 'done' ? 'done' : 'open';

  const groups = staff
    ? [{ title: 'All quizzes', items: quizzes }]
    : (() => {
        const open = quizzes.filter((q) => q.my?.canStart || q.my?.inProgressId);
        const done = quizzes.filter((q) => !(q.my?.canStart || q.my?.inProgressId));
        return [{ title: tab === 'open' ? 'Available now' : 'Finished & closed', items: tab === 'open' ? open : done, counts: { open: open.length, done: done.length } }];
      })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="Quizzes"
        subtitle={staff ? 'Create quizzes for your programs and sessions, and see how students did.' : 'Quizzes from your programs.'}
        actions={
          staff ? (
            <Link href="/quizzes/new" className="btn-primary inline-flex items-center gap-2 h-10">
              {Icons.plus} New quiz
            </Link>
          ) : undefined
        }
      />

      {!staff && (
        <nav className="flex p-1 rounded-[var(--radius-md)] bg-surface border border-border w-fit" aria-label="Quiz tabs">
          {(['open', 'done'] as const).map((t) => (
            <Link
              key={t}
              href={t === 'open' ? '/quizzes' : '/quizzes?tab=done'}
              aria-current={tab === t ? 'page' : undefined}
              className={`h-9 px-4 inline-flex items-center rounded-[calc(var(--radius-md)-2px)] text-sm font-medium ${tab === t ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text'}`}
            >
              {t === 'open' ? 'Available' : 'Finished & closed'}
            </Link>
          ))}
        </nav>
      )}

      {groups.map((g) =>
        g.items.length === 0 ? (
          <div key={g.title} className="bg-surface border border-border rounded-[var(--radius-lg)]">
            <EmptyNote
              title={staff ? 'No quizzes yet.' : tab === 'open' ? 'No quizzes to take right now.' : 'Nothing here yet.'}
              text={staff ? 'Create one for a program or a single session.' : 'New quizzes appear here and in your notifications.'}
              action={staff ? <Link href="/quizzes/new" className="btn-primary text-sm">New quiz</Link> : undefined}
            />
          </div>
        ) : (
          <div key={g.title} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {g.items.map((q) => (
              <Link
                key={q.id}
                href={`/quizzes/${q.id}`}
                className="group flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] p-5 hover:border-primary transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted truncate">
                    {q.programName}
                    {q.sessionTitle ? ` · ${q.sessionTitle}` : ''}
                  </span>
                  {staff ? (
                    <Badge tone={q.status === 'published' ? 'success' : q.status === 'closed' ? 'danger' : 'muted'} dot>{q.status}</Badge>
                  ) : q.my?.inProgressId ? (
                    <Badge tone="warning" dot>in progress</Badge>
                  ) : q.my?.bestPercent !== null && q.my?.bestPercent !== undefined ? (
                    <Badge tone={q.my.bestPercent >= q.passPercent ? 'success' : 'danger'}>{q.my.bestPercent}%</Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 font-semibold group-hover:underline">{q.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  {q.questionCount} question{q.questionCount === 1 ? '' : 's'} · {q.totalPoints} pts
                  {q.timeLimitMin ? ` · ${q.timeLimitMin} min` : ' · no time limit'}
                </p>
                <div className="mt-auto pt-4 text-xs text-muted space-y-0.5">
                  {q.closesAt && (
                    <p>
                      {new Date(q.closesAt) > new Date() ? 'Closes' : 'Closed'} {formatDateTime(q.closesAt)} ({formatRelative(q.closesAt)})
                    </p>
                  )}
                  {staff ? (
                    <p>
                      {q.attemptCount ?? 0} attempt{q.attemptCount === 1 ? '' : 's'}
                      {q.avgPercent !== null && q.avgPercent !== undefined ? ` · average ${q.avgPercent}%` : ''}
                    </p>
                  ) : (
                    <p>
                      {q.my?.attempts ?? 0}/{q.maxAttempts || '∞'} attempts used
                      {q.my && !q.my.canStart && q.my.reason ? ` · ${q.my.reason}` : ''}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
