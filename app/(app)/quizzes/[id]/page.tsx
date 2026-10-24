// =============================================================================
// FILE: app/(app)/quizzes/[id]/page.tsx   (NEW FILE)
// Quiz overview.
//  Students: rules, Start / Resume, previous attempts.
//  Staff: actions, results per student, per-question difficulty, answer key.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getQuizOverview, getQuizResults, getQuizForEditor } from '@/lib/quizzes';
import { QUESTION_TYPE_LABELS } from '@/lib/constants';
import { formatDateTime, formatRelative, timeZoneLabel } from '@/lib/time';
import { PageHeader, Panel, Badge, EmptyNote, Icons } from '@/components/ui';
import { StartQuizButton, StaffQuizActions, ResetAttemptButton } from '../QuizControls';

export const dynamic = 'force-dynamic';

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg px-3.5 py-2.5 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const ov = await getQuizOverview(user.orgId, user, id);
  if (!ov) notFound();
  const q = ov.quiz;

  const facts = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Fact label="Questions" value={q.questionCount} />
      <Fact label="Points" value={q.totalPoints} />
      <Fact label="Time limit" value={q.timeLimitMin ? `${q.timeLimitMin} min` : 'None'} />
      <Fact label="Attempts" value={q.maxAttempts || 'Unlimited'} />
      <Fact label="Pass mark" value={`${q.passPercent}%`} />
      <Fact label="Closes" value={q.closesAt ? formatDateTime(q.closesAt) : 'Never'} />
    </div>
  );

  // ----------------------------------------------------------------- student
  if (ov.access === 'take') {
    const my = q.my!;
    const label = my.inProgressId ? 'Resume quiz' : my.attempts > 0 ? 'Start another attempt' : 'Start quiz';
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          back={{ href: '/quizzes', label: 'Quizzes' }}
          eyebrow={`${q.programName}${q.sessionTitle ? ` · ${q.sessionTitle}` : ''}`}
          title={q.title}
        />
        {facts}
        {q.opensAt && new Date(q.opensAt) > new Date() && (
          <p className="text-sm text-muted">Opens {formatDateTime(q.opensAt)} ({timeZoneLabel()}).</p>
        )}
        {q.description && <div className="bg-hero rounded-[var(--radius-lg)] p-4 text-sm whitespace-pre-line">{q.description}</div>}
        <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium">
              {my.attempts}/{q.maxAttempts || '∞'} attempts used
              {my.bestPercent !== null && <> · best score <b>{my.bestPercent}%</b></>}
            </p>
            <p className="text-muted text-xs mt-1">
              {my.canStart
                ? q.timeLimitMin
                  ? `Once you start, you have ${q.timeLimitMin} minutes. Answers save automatically.`
                  : 'Answers save automatically — you can come back before submitting.'
                : my.reason}
            </p>
          </div>
          {my.canStart && <StartQuizButton quizId={q.id} label={label} timeLimitMin={my.inProgressId ? 0 : q.timeLimitMin} />}
        </section>

        <Panel title="Your attempts" icon={Icons.clock} bodyClassName="p-0">
          {ov.attempts.length === 0 ? (
            <EmptyNote compact title="No attempts yet." />
          ) : (
            <ul className="divide-y divide-border">
              {ov.attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    Attempt {a.attemptNo}
                    <span className="text-muted text-xs ml-2">
                      {a.status === 'in_progress' ? 'in progress' : a.submittedAt ? `submitted ${formatDateTime(a.submittedAt)}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {a.status === 'submitted' &&
                      (a.needsReview ? (
                        <Badge tone="warning">being marked</Badge>
                      ) : a.percent !== null ? (
                        <Badge tone={a.passed ? 'success' : 'danger'}>{a.percent}%</Badge>
                      ) : (
                        <Badge tone="muted">submitted</Badge>
                      ))}
                    {a.status === 'submitted' && (
                      <Link href={`/quizzes/${q.id}/results/${a.id}`} className="text-xs underline">
                        View
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    );
  }

  // ----------------------------------------------------------------- staff
  const [results, editor] = await Promise.all([getQuizResults(user.orgId, user, id), getQuizForEditor(user.orgId, user, id)]);
  if (!results || !editor) notFound();
  const s = results.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/quizzes', label: 'Quizzes' }}
        eyebrow={`${q.programName}${q.sessionTitle ? ` · ${q.sessionTitle}` : ''}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {q.title}
            <Badge tone={q.status === 'published' ? 'success' : q.status === 'closed' ? 'danger' : 'muted'} dot>{q.status}</Badge>
          </span>
        }
        actions={<StaffQuizActions quizId={q.id} status={q.status} attemptCount={editor.attemptCount} />}
      />
      {facts}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Students', s.students],
          ['Attempted', s.attempted],
          ['Average (best)', s.avgPercent === null ? '—' : `${s.avgPercent}%`],
          ['Pass rate', s.passRate === null ? '—' : `${s.passRate}%`],
          ['Need marking', s.needsReview],
        ].map(([label, value]) => (
          <div key={String(label)} className={`p-4 bg-surface border rounded-[var(--radius-lg)] ${label === 'Need marking' && Number(value) > 0 ? 'border-warning' : 'border-border'}`}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Panel title="Results by student" icon={Icons.users} bodyClassName="p-0">
        {results.rows.length === 0 ? (
          <EmptyNote compact title="No students in this program yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-bg border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Best</th>
                  <th className="px-4 py-3 font-medium">Last submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted">{r.memberId || r.email}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.attempts}
                      {r.inProgress && <Badge tone="warning" className="ml-2">in progress</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {r.needsReview ? (
                        <Badge tone="warning">needs marking</Badge>
                      ) : r.bestPercent === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <Badge tone={r.passed ? 'success' : 'danger'}>{r.bestPercent}%</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{r.lastSubmittedAt ? formatRelative(r.lastSubmittedAt) : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                      {r.bestAttemptId && (
                        <Link className="text-xs underline" href={`/quizzes/${q.id}/results/${r.bestAttemptId}`}>
                          {r.needsReview ? 'Mark' : 'View'}
                        </Link>
                      )}
                      {r.lastAttemptId && <ResetAttemptButton attemptId={r.lastAttemptId} name={r.name} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Questions & answer key" icon={Icons.check} bodyClassName="p-0">
        <ol className="divide-y divide-border">
          {editor.questions.map((qq, i) => {
            const stat = results.perQuestion[i];
            return (
              <li key={qq.id ?? i} className="px-5 py-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium whitespace-pre-line">
                    <span className="text-muted mr-1">{i + 1}.</span>
                    {qq.prompt}
                  </p>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {QUESTION_TYPE_LABELS[qq.type]} · {qq.points} pt{qq.points === 1 ? '' : 's'}
                    {stat?.correctRate !== null && stat?.correctRate !== undefined && (
                      <Badge tone={stat.correctRate >= 70 ? 'success' : stat.correctRate >= 40 ? 'warning' : 'danger'}>
                        {stat.correctRate}% correct
                      </Badge>
                    )}
                  </span>
                </div>
                {qq.options.length > 0 && (
                  <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
                    {qq.options.map((o, k) => (
                      <li key={o.id ?? k} className={`px-3 py-1.5 rounded-[var(--radius-md)] border ${o.correct ? 'border-success bg-success/10' : 'border-border'}`}>
                        {o.correct ? '✓ ' : ''}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                )}
                {qq.type === 'short' && (
                  <p className="text-sm text-muted">
                    Accepted: {qq.acceptedAnswers.length ? qq.acceptedAnswers.join(' · ') : 'marked by hand'}
                  </p>
                )}
                {qq.type === 'numeric' && (
                  <p className="text-sm text-muted">
                    Answer: {qq.numericAnswer}
                    {qq.tolerance ? ` (± ${qq.tolerance})` : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
