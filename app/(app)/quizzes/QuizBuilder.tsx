// =============================================================================
// FILE: app/(app)/quizzes/QuizBuilder.tsx   (NEW FILE)
// Create / edit a quiz: program + session, timing & rules, questions of five
// types (one answer, several answers, true/false, short text, number).
// Times are entered in the app time zone.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/constants';
import { EMPTY_QUESTION, quizProblems, type QuestionInput, type QuizEditorData, type QuizInput } from '@/lib/quiz-types';
import { toLocalDateTimeInput, localInputToIso, timeZoneLabel } from '@/lib/time';
import { saveQuizAction, setQuizStatusAction } from './actions';
import { Alert, Badge, Icons } from '@/components/ui';

type ProgramOption = { id: string; name: string; status: string; sessions: { id: string; title: string; startsAt: string }[] };

type Props = {
  programs: ProgramOption[];
  initial?: QuizEditorData;
  defaultProgramId?: string;
  defaultSessionId?: string;
};

const BLANK = (programId = '', sessionId = ''): QuizInput => ({
  programId,
  sessionId,
  title: '',
  description: '',
  timeLimitMin: 20,
  maxAttempts: 1,
  opensAt: '',
  closesAt: '',
  shuffleQuestions: false,
  shuffleOptions: true,
  showResults: 'immediately',
  showCorrectAnswers: true,
  passPercent: 50,
  questions: [EMPTY_QUESTION('single')],
});

export default function QuizBuilder({ programs, initial, defaultProgramId = '', defaultSessionId = '' }: Props) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizInput>(() => initial ?? BLANK(defaultProgramId || programs[0]?.id || '', defaultSessionId));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [emailStudents, setEmailStudents] = useState(false);
  const status = initial?.status ?? 'draft';

  const program = programs.find((p) => p.id === quiz.programId);
  const problems = useMemo(() => quizProblems(quiz), [quiz]);
  const total = quiz.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  function set<K extends keyof QuizInput>(k: K, v: QuizInput[K]) {
    setQuiz((q) => ({ ...q, [k]: v }));
  }
  function setQ(i: number, patch: Partial<QuestionInput>) {
    setQuiz((q) => ({ ...q, questions: q.questions.map((qq, j) => (j === i ? { ...qq, ...patch } : qq)) }));
  }
  function move(i: number, d: -1 | 1) {
    setQuiz((q) => {
      const a = [...q.questions];
      const j = i + d;
      if (j < 0 || j >= a.length) return q;
      [a[i], a[j]] = [a[j], a[i]];
      return { ...q, questions: a };
    });
  }
  function remove(i: number) {
    if (!confirm('Delete this question?')) return;
    setQuiz((q) => ({ ...q, questions: q.questions.filter((_, j) => j !== i) }));
  }
  function duplicate(i: number) {
    setQuiz((q) => {
      const src = q.questions[i];
      const copy: QuestionInput = { ...src, id: undefined, options: src.options.map((o) => ({ ...o, id: undefined })) };
      const a = [...q.questions];
      a.splice(i + 1, 0, copy);
      return { ...q, questions: a };
    });
  }
  function add(type: QuestionType) {
    setQuiz((q) => ({ ...q, questions: [...q.questions, EMPTY_QUESTION(type)] }));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  }
  function changeType(i: number, type: QuestionType) {
    const cur = quiz.questions[i];
    const fresh = EMPTY_QUESTION(type);
    const keepOptions = (type === 'single' || type === 'multiple') && (cur.type === 'single' || cur.type === 'multiple');
    setQ(i, {
      type,
      options: keepOptions
        ? type === 'single'
          ? cur.options.map((o, k) => ({ ...o, correct: k === cur.options.findIndex((x) => x.correct) }))
          : cur.options
        : fresh.options,
    });
  }

  function save(thenStatus?: 'published' | 'closed' | 'draft') {
    setMsg(null);
    if (thenStatus === 'published' && problems.length) {
      setMsg({ tone: 'error', text: `Fix before publishing: ${problems[0]}` });
      return;
    }
    start(async () => {
      const res = await saveQuizAction({ ...quiz, id: initial?.id });
      if (!res.ok) {
        setMsg({ tone: 'error', text: res.error });
        return;
      }
      if (thenStatus) {
        const st = await setQuizStatusAction({ id: res.id, status: thenStatus, email: emailStudents });
        if (!st.ok) {
          setMsg({ tone: 'error', text: st.error });
          if (!initial) router.replace(`/quizzes/${res.id}/edit`);
          return;
        }
      }
      setMsg({ tone: 'success', text: thenStatus === 'published' ? 'Published — students can see it now.' : 'Saved.' });
      if (!initial || thenStatus) router.push(`/quizzes/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {initial && initial.attemptCount > 0 && (
        <Alert tone="info">
          {initial.attemptCount} attempt{initial.attemptCount === 1 ? ' has' : 's have'} already been made. Changing correct
          answers or points won&apos;t re-mark finished attempts.
        </Alert>
      )}

      {/* ---------------- Details ---------------- */}
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">{Icons.clipboard} Details</h2>
          <Badge tone={status === 'published' ? 'success' : status === 'closed' ? 'danger' : 'muted'} dot>{status}</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="qz-program">Program</label>
            <select
              id="qz-program"
              className="input"
              value={quiz.programId}
              onChange={(e) => setQuiz((q) => ({ ...q, programId: e.target.value, sessionId: '' }))}
            >
              {programs.length === 0 && <option value="">No programs</option>}
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status !== 'active' ? ` (${p.status})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qz-session">Session (optional)</label>
            <select id="qz-session" className="input" value={quiz.sessionId} onChange={(e) => set('sessionId', e.target.value)}>
              <option value="">Whole program</option>
              {(program?.sessions ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="qz-title">Title</label>
          <input id="qz-title" className="input" maxLength={200} value={quiz.title} onChange={(e) => set('title', e.target.value)} placeholder="Week 1 check-in: Cybersecurity basics" />
        </div>
        <div>
          <label className="label" htmlFor="qz-desc">Instructions (optional)</label>
          <textarea id="qz-desc" className="input min-h-[80px]" maxLength={4000} value={quiz.description} onChange={(e) => set('description', e.target.value)} placeholder="Answer all questions. You can't pause once you start." />
        </div>
      </section>

      {/* ---------------- Rules ---------------- */}
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">{Icons.clock} Timing & rules</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="qz-time">Time limit (minutes)</label>
            <input id="qz-time" className="input" type="number" min={0} max={600} value={quiz.timeLimitMin} onChange={(e) => set('timeLimitMin', Math.max(0, Number(e.target.value) || 0))} />
            <p className="text-xs text-muted mt-1">0 = no time limit</p>
          </div>
          <div>
            <label className="label" htmlFor="qz-att">Attempts allowed</label>
            <input id="qz-att" className="input" type="number" min={0} max={20} value={quiz.maxAttempts} onChange={(e) => set('maxAttempts', Math.max(0, Number(e.target.value) || 0))} />
            <p className="text-xs text-muted mt-1">0 = unlimited · best score counts</p>
          </div>
          <div>
            <label className="label" htmlFor="qz-pass">Pass mark (%)</label>
            <input id="qz-pass" className="input" type="number" min={0} max={100} value={quiz.passPercent} onChange={(e) => set('passPercent', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <label className="label" htmlFor="qz-open">Opens (optional)</label>
            <input id="qz-open" className="input" type="datetime-local" value={toLocalDateTimeInput(quiz.opensAt)} onChange={(e) => set('opensAt', localInputToIso(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="qz-close">Closes (optional)</label>
            <input id="qz-close" className="input" type="datetime-local" value={toLocalDateTimeInput(quiz.closesAt)} onChange={(e) => set('closesAt', localInputToIso(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="qz-show">Show score to students</label>
            <select id="qz-show" className="input" value={quiz.showResults} onChange={(e) => set('showResults', e.target.value as QuizInput['showResults'])}>
              <option value="immediately">Right after submitting</option>
              <option value="after_close">After the quiz closes</option>
              <option value="never">Never (staff only)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted">Times are in {timeZoneLabel()}. If a student starts late, the timer ends at the closing time.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={quiz.shuffleQuestions} onChange={(e) => set('shuffleQuestions', e.target.checked)} />
            Shuffle question order
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={quiz.shuffleOptions} onChange={(e) => set('shuffleOptions', e.target.checked)} />
            Shuffle answer options
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={quiz.showCorrectAnswers} onChange={(e) => set('showCorrectAnswers', e.target.checked)} />
            Show correct answers & explanations with the score
          </label>
        </div>
      </section>

      {/* ---------------- Questions ---------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            Questions <span className="text-muted font-normal text-sm">({quiz.questions.length} · {total} points)</span>
          </h2>
        </div>

        {quiz.questions.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            index={i}
            count={quiz.questions.length}
            onChange={(p) => setQ(i, p)}
            onType={(t) => changeType(i, t)}
            onMove={(d) => move(i, d)}
            onRemove={() => remove(i)}
            onDuplicate={() => duplicate(i)}
          />
        ))}

        <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-border p-4">
          <p className="text-sm font-medium mb-2">Add a question</p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <button key={t} type="button" className="btn-outline h-9 text-sm" onClick={() => add(t)}>
                {Icons.plus} {QUESTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 px-4 py-3 sm:rounded-[var(--radius-lg)] border-t sm:border border-border bg-surface/95 backdrop-blur flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="text-xs">
          {problems.length ? (
            <span className="text-warning">
              {problems.length} thing{problems.length === 1 ? '' : 's'} to fix before publishing: {problems[0]}
            </span>
          ) : (
            <span className="text-success">Ready to publish ✓</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === 'draft' && (
            <label className="flex items-center gap-2 text-xs mr-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={emailStudents} onChange={(e) => setEmailStudents(e.target.checked)} />
              Also email students when published
            </label>
          )}
          <button type="button" className="btn-outline h-10" disabled={pending} onClick={() => save()}>
            {pending ? 'Saving…' : status === 'draft' ? 'Save draft' : 'Save changes'}
          </button>
          {status !== 'published' && (
            <button type="button" className="btn-primary h-10 px-5" disabled={pending} onClick={() => save('published')}>
              {status === 'closed' ? 'Re-open' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  count,
  onChange,
  onType,
  onMove,
  onRemove,
  onDuplicate,
}: {
  q: QuestionInput;
  index: number;
  count: number;
  onChange: (p: Partial<QuestionInput>) => void;
  onType: (t: QuestionType) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const isChoice = q.type === 'single' || q.type === 'multiple' || q.type === 'true_false';

  function setOption(k: number, patch: Partial<QuestionInput['options'][number]>) {
    let options = q.options.map((o, j) => (j === k ? { ...o, ...patch } : o));
    if (patch.correct && (q.type === 'single' || q.type === 'true_false')) {
      options = options.map((o, j) => ({ ...o, correct: j === k }));
    }
    onChange({ options });
  }

  return (
    <article className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-border bg-bg">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-primary text-primary-fg text-xs font-semibold">{index + 1}</span>
        <select className="input h-9 w-auto text-sm" value={q.type} onChange={(e) => onType(e.target.value as QuestionType)} aria-label="Question type">
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Points
          <input
            className="input h-9 w-20 text-sm"
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={q.points}
            onChange={(e) => onChange({ points: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <span className="ml-auto flex items-center gap-1">
          <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</IconBtn>
          <IconBtn label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>↓</IconBtn>
          <IconBtn label="Duplicate" onClick={onDuplicate}>⧉</IconBtn>
          <IconBtn label="Delete" onClick={onRemove} danger>✕</IconBtn>
        </span>
      </header>

      <div className="p-4 sm:p-5 space-y-4">
        <textarea
          className="input min-h-[70px]"
          maxLength={3000}
          value={q.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Type the question…"
          aria-label={`Question ${index + 1}`}
        />

        {isChoice && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              {q.type === 'multiple' ? 'Tick every correct answer (partial marks for partly right).' : 'Choose the correct answer.'}
            </p>
            {q.options.map((o, k) => (
              <div key={k} className="flex items-center gap-2">
                <input
                  type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                  name={`correct-${index}`}
                  checked={o.correct}
                  onChange={(e) => setOption(k, { correct: q.type === 'multiple' ? e.target.checked : true })}
                  className="w-4 h-4 accent-[var(--color-success)] shrink-0"
                  aria-label={`Option ${k + 1} is correct`}
                />
                <input
                  className={`input h-10 ${o.correct ? 'border-success' : ''}`}
                  value={o.text}
                  maxLength={500}
                  readOnly={q.type === 'true_false'}
                  onChange={(e) => setOption(k, { text: e.target.value })}
                  placeholder={`Option ${k + 1}`}
                />
                {q.type !== 'true_false' && q.options.length > 2 && (
                  <IconBtn label="Remove option" onClick={() => onChange({ options: q.options.filter((_, j) => j !== k) })}>✕</IconBtn>
                )}
              </div>
            ))}
            {q.type !== 'true_false' && q.options.length < 12 && (
              <button type="button" className="btn-ghost h-8 text-xs" onClick={() => onChange({ options: [...q.options, { text: '', correct: false }] })}>
                {Icons.plus} Add option
              </button>
            )}
          </div>
        )}

        {q.type === 'short' && (
          <div>
            <label className="label">Accepted answers (one per line)</label>
            <textarea
              className="input min-h-[70px] font-mono text-sm"
              value={q.acceptedAnswers.join('\n')}
              onChange={(e) => onChange({ acceptedAnswers: e.target.value.split('\n').slice(0, 20) })}
              placeholder={'phishing\nphishing attack'}
            />
            <p className="text-xs text-muted mt-1">
              Not case-sensitive. Leave empty to mark every answer by hand.
            </p>
          </div>
        )}

        {q.type === 'numeric' && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="label">Correct number</label>
              <input
                className="input"
                type="number"
                step="any"
                value={q.numericAnswer ?? ''}
                onChange={(e) => onChange({ numericAnswer: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Allowed difference (±)</label>
              <input className="input" type="number" min={0} step="any" value={q.tolerance} onChange={(e) => onChange({ tolerance: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Explanation shown after marking (optional)</summary>
          <textarea
            className="input min-h-[60px] mt-2"
            maxLength={2000}
            value={q.explanation}
            onChange={(e) => onChange({ explanation: e.target.value })}
            placeholder="Why this is the right answer…"
          />
        </details>
      </div>
    </article>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid place-items-center w-8 h-8 rounded-[var(--radius-md)] text-sm border border-border hover:bg-hero disabled:opacity-30 ${danger ? 'text-danger' : 'text-muted'}`}
    >
      {children}
    </button>
  );
}
