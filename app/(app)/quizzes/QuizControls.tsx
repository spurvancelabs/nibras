// =============================================================================
// FILE: app/(app)/quizzes/QuizControls.tsx   (NEW FILE)
// Small client buttons for quiz pages (start/resume, publish/close, duplicate,
// delete, reset attempt).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  startAttemptAction,
  setQuizStatusAction,
  duplicateQuizAction,
  deleteQuizAction,
  resetAttemptAction,
} from './actions';

export function StartQuizButton({ quizId, label, disabled, timeLimitMin }: { quizId: string; label: string; disabled?: boolean; timeLimitMin: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary h-11 px-6"
        disabled={disabled || pending}
        onClick={() => {
          if (label.startsWith('Start') && timeLimitMin > 0 && !confirm(`The ${timeLimitMin}-minute timer starts now and keeps running even if you close the page. Start?`)) return;
          setErr('');
          start(async () => {
            const r = await startAttemptAction({ quizId });
            if (r.ok) router.push(`/quizzes/${quizId}/attempt/${r.attemptId}`);
            else setErr(r.error);
          });
        }}
      >
        {pending ? 'Opening…' : label}
      </button>
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function StaffQuizActions({ quizId, status, attemptCount }: { quizId: string; status: 'draft' | 'published' | 'closed'; attemptCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');

  function run(fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, after?: (r: { id?: string }) => void) {
    setErr('');
    start(async () => {
      const r = await fn();
      if (r.ok) {
        after?.(r);
        router.refresh();
      } else setErr(r.error ?? 'Something went wrong');
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={`/quizzes/${quizId}/edit`} className="btn-outline h-10 inline-flex items-center">Edit</a>
        {status === 'published' && (
          <button type="button" className="btn-outline h-10" disabled={pending} onClick={() => confirm('Close the quiz? Students can no longer start or submit new attempts.') && run(() => setQuizStatusAction({ id: quizId, status: 'closed' }))}>
            Close quiz
          </button>
        )}
        {status !== 'published' && (
          <button type="button" className="btn-primary h-10" disabled={pending} onClick={() => run(() => setQuizStatusAction({ id: quizId, status: 'published' }))}>
            {status === 'closed' ? 'Re-open' : 'Publish'}
          </button>
        )}
        {status === 'published' && attemptCount === 0 && (
          <button type="button" className="btn-outline h-10" disabled={pending} onClick={() => run(() => setQuizStatusAction({ id: quizId, status: 'draft' }))}>
            Back to draft
          </button>
        )}
        <button type="button" className="btn-outline h-10" disabled={pending} onClick={() => run(() => duplicateQuizAction({ id: quizId }), (r) => r.id && router.push(`/quizzes/${r.id}/edit`))}>
          Duplicate
        </button>
        <a href={`/quizzes/${quizId}/export`} className="btn-outline h-10 inline-flex items-center">Export CSV</a>
        <button
          type="button"
          className="btn-danger h-10"
          disabled={pending}
          onClick={() =>
            confirm(attemptCount ? `Delete this quiz and all ${attemptCount} attempts? This can't be undone.` : 'Delete this quiz?') &&
            run(() => deleteQuizAction({ id: quizId }), () => router.push('/quizzes'))
          }
        >
          Delete
        </button>
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function ResetAttemptButton({ attemptId, name }: { attemptId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-danger underline hover:opacity-80"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name}'s latest attempt so they can try again?`)) return;
        start(async () => {
          const r = await resetAttemptAction({ attemptId });
          if (r.ok) router.refresh();
          else alert(r.error);
        });
      }}
    >
      {pending ? '…' : 'Reset'}
    </button>
  );
}
