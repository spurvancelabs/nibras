// =============================================================================
// FILE: app/(app)/quizzes/QuizPlayer.tsx   (NEW FILE)
// Taking a quiz: countdown (synced to the server clock), autosave while
// answering, question navigator, submit (auto-submits when time runs out).
// The server re-checks the time limit — the countdown is only a display.
// =============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PlayerAnswer, PlayerData } from '@/lib/quiz-types';
import { saveAnswersAction, submitAttemptAction } from './actions';
import { Alert } from '@/components/ui';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function QuizPlayer({ data }: { data: PlayerData }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, PlayerAnswer>>(() =>
    Object.fromEntries(data.answers.map((a) => [a.questionId, a]))
  );
  const [save, setSave] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [submitting, startSubmit] = useTransition();
  const dirty = useRef(false);
  const submitted = useRef(false);

  // server clock offset so a wrong computer clock doesn't change the timer
  const offset = useMemo(() => new Date(data.serverNow).getTime() - Date.now(), [data.serverNow]);
  const deadline = data.deadlineAt ? new Date(data.deadlineAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 500);
    return () => clearInterval(t);
  }, [offset]);
  const left = deadline ? deadline - now : null;

  const list = useMemo(() => Object.values(answers), [answers]);
  const answeredCount = data.questions.filter((q) => isAnswered(answers[q.id])).length;

  const persist = useCallback(async () => {
    if (!dirty.current || submitted.current) return;
    dirty.current = false;
    setSave('saving');
    const res = await saveAnswersAction({ attemptId: data.attemptId, answers: list });
    if (res.ok) setSave('saved');
    else {
      setSave('error');
      setError(res.error);
      if (/time is up/i.test(res.error)) router.replace(`/quizzes/${data.quizId}/results/${data.attemptId}`);
      else dirty.current = true;
    }
  }, [data.attemptId, data.quizId, list, router]);

  // autosave 1.2 s after the last change
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(persist, 1200);
    return () => clearTimeout(t);
  }, [list, persist]);

  // warn before leaving with unsaved answers
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current && !submitted.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return;
      if (!auto) {
        const missing = data.questions.length - answeredCount;
        const text = missing
          ? `You haven't answered ${missing} question${missing === 1 ? '' : 's'}. Submit anyway?`
          : 'Submit your answers? You can’t change them afterwards.';
        if (!confirm(text)) return;
      }
      submitted.current = true;
      startSubmit(async () => {
        const res = await submitAttemptAction({ attemptId: data.attemptId, answers: list });
        if (res.ok) router.replace(`/quizzes/${res.quizId}/results/${res.attemptId}`);
        else {
          submitted.current = false;
          setError(res.error);
        }
      });
    },
    [answeredCount, data.attemptId, data.questions.length, list, router]
  );

  // time up → submit automatically
  useEffect(() => {
    if (left !== null && left <= 0 && !submitted.current) submit(true);
  }, [left, submit]);

  function update(qid: string, patch: Partial<PlayerAnswer>) {
    dirty.current = true;
    setSave('idle');
    setAnswers((a) => ({
      ...a,
      [qid]: { ...(a[qid] ?? { questionId: qid, selected: [], text: '', number: null }), ...patch },
    }));
  }

  const warn = left !== null && left < 60_000;

  return (
    <div className="space-y-5">
      {/* Sticky status bar */}
      <div className="sticky top-[4.25rem] z-20 bg-surface/95 backdrop-blur border border-border rounded-[var(--radius-lg)] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{data.title}</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-hero overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / Math.max(1, data.questions.length)) * 100}%` }} />
          </div>
          <p className="text-[11px] text-muted mt-1">
            {answeredCount}/{data.questions.length} answered · attempt {data.attemptNo}
            {data.maxAttempts > 0 ? ` of ${data.maxAttempts}` : ''} ·{' '}
            {save === 'saving' ? 'Saving…' : save === 'saved' ? 'All answers saved ✓' : save === 'error' ? 'Not saved — retrying' : 'Answers save automatically'}
          </p>
        </div>
        {left !== null && (
          <div
            role="timer"
            aria-live={warn ? 'assertive' : 'off'}
            className={`text-2xl font-semibold tabular-nums px-3 py-1 rounded-[var(--radius-md)] ${warn ? 'bg-danger/10 text-danger' : 'bg-hero'}`}
          >
            {fmtClock(left)}
          </div>
        )}
        <button type="button" className="btn-primary h-11 px-6" disabled={submitting} onClick={() => submit(false)}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {error && <Alert>{error}</Alert>}
      {data.description && (
        <div className="bg-hero rounded-[var(--radius-lg)] px-4 py-3 text-sm whitespace-pre-line">{data.description}</div>
      )}

      {/* Navigator */}
      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {data.questions.map((q, i) => (
          <a
            key={q.id}
            href={`#q-${q.id}`}
            className={`grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-xs font-semibold border transition ${
              isAnswered(answers[q.id]) ? 'bg-primary text-primary-fg border-primary' : 'border-border hover:bg-hero'
            }`}
          >
            {i + 1}
          </a>
        ))}
      </nav>

      <ol className="space-y-4">
        {data.questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <li key={q.id} id={`q-${q.id}`} className="scroll-mt-40 bg-surface border border-border rounded-[var(--radius-lg)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium whitespace-pre-line">
                  <span className="text-muted mr-1.5">{i + 1}.</span>
                  {q.prompt}
                </p>
                <span className="text-[11px] text-muted shrink-0">
                  {q.points} pt{q.points === 1 ? '' : 's'}
                </span>
              </div>
              {q.type === 'multiple' && <p className="text-xs text-muted mt-1">Select all that apply.</p>}

              {(q.type === 'single' || q.type === 'true_false' || q.type === 'multiple') && (
                <div className={`mt-3 grid gap-2 ${q.type === 'true_false' ? 'sm:grid-cols-2' : ''}`}>
                  {q.options.map((o) => {
                    const on = a?.selected.includes(o.id) ?? false;
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border cursor-pointer transition ${
                          on ? 'border-primary bg-hero ring-1 ring-primary' : 'border-border hover:bg-hero/50'
                        }`}
                      >
                        <input
                          type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                          name={`q-${q.id}`}
                          checked={on}
                          onChange={(e) => {
                            const cur = a?.selected ?? [];
                            const selected =
                              q.type === 'multiple'
                                ? e.target.checked
                                  ? [...cur, o.id]
                                  : cur.filter((x) => x !== o.id)
                                : [o.id];
                            update(q.id, { selected });
                          }}
                          className="w-4 h-4 accent-[var(--color-primary)] shrink-0"
                        />
                        <span className="text-sm">{o.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'short' && (
                <textarea
                  className="input mt-3 min-h-[80px]"
                  maxLength={2000}
                  value={a?.text ?? ''}
                  onChange={(e) => update(q.id, { text: e.target.value })}
                  placeholder="Your answer"
                  aria-label={`Answer to question ${i + 1}`}
                />
              )}

              {q.type === 'numeric' && (
                <input
                  className="input mt-3 max-w-xs"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={a?.number ?? ''}
                  onChange={(e) => update(q.id, { number: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="Number"
                  aria-label={`Answer to question ${i + 1}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-end">
        <button type="button" className="btn-primary h-11 px-8" disabled={submitting} onClick={() => submit(false)}>
          {submitting ? 'Submitting…' : 'Submit answers'}
        </button>
      </div>
    </div>
  );
}

function isAnswered(a: PlayerAnswer | undefined) {
  if (!a) return false;
  return a.selected.length > 0 || a.text.trim() !== '' || (a.number !== null && a.number !== undefined);
}
