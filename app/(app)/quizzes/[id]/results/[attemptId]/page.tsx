// =============================================================================
// FILE: app/(app)/quizzes/[id]/results/[attemptId]/page.tsx   (NEW FILE)
// Result of one attempt. Students see what the quiz settings allow; staff see
// everything and can mark short answers / override points.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getResult } from '@/lib/quizzes';
import { formatDateTime } from '@/lib/time';
import { PageHeader, Badge, ProgressRing, Alert } from '@/components/ui';
import ManualGrade from './ManualGrade';

export const dynamic = 'force-dynamic';

export default async function ResultPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireAuth();
  const { id, attemptId } = await params;
  const r = await getResult(user.orgId, user, attemptId);
  if (!r || r.quizId !== id) notFound();
  const staff = user.role !== 'student';

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        back={{ href: `/quizzes/${id}`, label: r.quizTitle }}
        eyebrow={staff ? `${r.studentName} · attempt ${r.attemptNo}` : `Attempt ${r.attemptNo}`}
        title="Result"
        subtitle={
          r.submittedAt
            ? `Submitted ${formatDateTime(r.submittedAt)}${r.autoSubmitted ? ' (automatically, when time ran out)' : ''}`
            : 'In progress'
        }
      />

      <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row sm:items-center gap-5">
        {r.scoreVisible ? (
          <>
            <ProgressRing value={r.percent / 100} size={96} label={`${r.percent}%`} />
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {r.score} / {r.maxScore} points
              </p>
              {r.needsReview ? (
                <Badge tone="warning">Some answers are still being marked</Badge>
              ) : r.passed ? (
                <Badge tone="success">Passed (pass mark {r.passPercent}%)</Badge>
              ) : (
                <Badge tone="danger">Not passed (pass mark {r.passPercent}%)</Badge>
              )}
            </div>
          </>
        ) : (
          <div>
            <p className="font-semibold">Your answers were submitted ✓</p>
            <p className="text-sm text-muted">Your score will be shown when your mentor releases the results.</p>
          </div>
        )}
      </section>

      {staff && r.needsReview && <Alert tone="info">Mark the answers below that say “needs marking”.</Alert>}

      {(r.detailVisible || r.scoreVisible) && (
        <ol className="space-y-4">
          {r.questions.map((q, i) => {
            const a = q.answer;
            const tone = q.correct === true ? 'border-success/50' : q.correct === false ? 'border-danger/40' : 'border-border';
            return (
              <li key={q.id} className={`bg-surface border rounded-[var(--radius-lg)] p-4 sm:p-5 ${tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium whitespace-pre-line">
                    <span className="text-muted mr-1.5">{i + 1}.</span>
                    {q.prompt}
                  </p>
                  <span className="shrink-0">
                    {q.awarded === null ? (
                      <Badge tone="warning">needs marking</Badge>
                    ) : (
                      <Badge tone={q.correct ? 'success' : q.awarded > 0 ? 'warning' : 'danger'}>
                        {q.awarded}/{q.points}
                      </Badge>
                    )}
                  </span>
                </div>

                {q.options.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {q.options.map((o) => {
                      const picked = a?.selected.includes(o.id);
                      const right = q.correctOptionIds?.includes(o.id);
                      return (
                        <li
                          key={o.id}
                          className={`px-3 py-2 rounded-[var(--radius-md)] border flex items-center justify-between gap-2 ${
                            right ? 'border-success bg-success/10' : picked ? 'border-danger/50 bg-danger/5' : 'border-border'
                          }`}
                        >
                          <span>{o.text}</span>
                          <span className="text-[11px] text-muted shrink-0">
                            {picked ? 'your answer' : ''}
                            {right ? (picked ? ' · correct' : 'correct') : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {q.type === 'short' && (
                  <div className="mt-3 text-sm space-y-1">
                    <p className="px-3 py-2 rounded-[var(--radius-md)] bg-bg border border-border whitespace-pre-line">
                      {a?.text?.trim() ? a.text : <span className="text-muted">No answer</span>}
                    </p>
                    {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                      <p className="text-xs text-muted">Accepted: {q.acceptedAnswers.join(' · ')}</p>
                    )}
                  </div>
                )}
                {q.type === 'numeric' && (
                  <div className="mt-3 text-sm">
                    <p>
                      Answer: <b>{a?.number ?? '—'}</b>
                      {q.numericAnswer !== undefined && q.numericAnswer !== null && (
                        <span className="text-muted">
                          {' '}
                          · correct: {q.numericAnswer}
                          {q.tolerance ? ` (± ${q.tolerance})` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {q.feedback && <p className="mt-3 text-sm bg-hero rounded-[var(--radius-md)] px-3 py-2">💬 {q.feedback}</p>}
                {q.explanation && <p className="mt-3 text-sm text-muted">💡 {q.explanation}</p>}

                {staff && r.submittedAt && (q.type === 'short' || q.awarded === null) && (
                  <ManualGrade attemptId={r.attemptId} questionId={q.id} max={q.points} current={q.awarded} feedback={q.feedback} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex justify-end">
        <Link href={`/quizzes/${id}`} className="btn-outline h-10 inline-flex items-center">Back to quiz</Link>
      </div>
    </div>
  );
}
