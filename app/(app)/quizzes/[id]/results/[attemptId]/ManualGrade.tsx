// =============================================================================
// FILE: app/(app)/quizzes/[id]/results/[attemptId]/ManualGrade.tsx   (NEW FILE)
// Staff: set points (and an optional note) for one answer.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { gradeAnswerAction } from '../../../actions';

export default function ManualGrade({
  attemptId,
  questionId,
  max,
  current,
  feedback,
}: {
  attemptId: string;
  questionId: string;
  max: number;
  current: number | null;
  feedback: string;
}) {
  const router = useRouter();
  const [points, setPoints] = useState<string>(current === null ? '' : String(current));
  const [note, setNote] = useState(feedback);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');

  return (
    <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted" htmlFor={`pts-${questionId}`}>Points</label>
        <input
          id={`pts-${questionId}`}
          className="input h-9 w-24 text-sm"
          type="number"
          min={0}
          max={max}
          step="0.5"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
        <span className="text-xs text-muted">/ {max}</span>
        <button type="button" className="btn-ghost h-8 text-xs" onClick={() => setPoints(String(max))}>Full</button>
        <button type="button" className="btn-ghost h-8 text-xs" onClick={() => setPoints('0')}>Zero</button>
      </div>
      <input className="input h-9 text-sm" maxLength={1000} placeholder="Note for the student (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary h-9 text-sm px-4"
          disabled={pending || points === ''}
          onClick={() =>
            start(async () => {
              setMsg('');
              const r = await gradeAnswerAction({ attemptId, questionId, points: Number(points), feedback: note });
              if (r.ok) {
                setMsg('Saved ✓');
                router.refresh();
              } else setMsg(r.error);
            })
          }
        >
          {pending ? 'Saving…' : 'Save mark'}
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
