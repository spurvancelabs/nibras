'use client';

// =============================================================================
// FILE: app/(app)/grading/setup/[id]/SetupForm.tsx   (NEW FILE)
// Rubric editor (criteria with points), private reference answer, guidance
// for the AI, and the per-assignment AI switch.
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui';
import { Toggle } from '@/components/settings-ui';
import { useToast } from '@/components/feedback';
import NavIcon from '@/components/NavIcon';
import type { Criterion } from '@/lib/ai-grading-core';
import { saveSetupAction } from '../../actions';

type Setup = { rubric: Criterion[]; referenceAnswer: string; guidance: string; aiEnabled: boolean };

const TEMPLATE: Criterion[] = [
  { id: 'understanding', title: 'Understanding', description: 'Shows they understand the main ideas.', maxPoints: 4 },
  { id: 'accuracy', title: 'Accuracy', description: 'Facts, steps or code are correct.', maxPoints: 4 },
  { id: 'clarity', title: 'Clarity', description: 'Well organised and easy to follow.', maxPoints: 2 },
];

export default function SetupForm({ assignmentId, maxMarks, initial }: { assignmentId: string; maxMarks: number; initial: Setup }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Setup>(initial);
  const [pending, start] = useTransition();
  const total = f.rubric.reduce((a, c) => a + (Number(c.maxPoints) || 0), 0);

  const setCrit = (i: number, patch: Partial<Criterion>) => setF((x) => ({ ...x, rubric: x.rubric.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  function save() {
    start(async () => {
      const r = await saveSetupAction({ assignmentId, ...f, rubric: f.rubric.filter((c) => c.title.trim()) });
      if (r.ok) {
        toast.success('Grading setup saved.');
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Rubric"
        icon={<NavIcon name="grading" size={16} />}
        action={
          f.rubric.length === 0 ? (
            <button type="button" className="btn-outline h-8 px-3 text-xs" onClick={() => setF((x) => ({ ...x, rubric: TEMPLATE }))}>
              Use a starter rubric
            </button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {f.rubric.length === 0 && <p className="text-sm text-muted">No rubric — the AI and you will grade “overall quality” out of {maxMarks}. Add criteria for more consistent marking.</p>}
          {f.rubric.map((c, i) => (
            <div key={i} className="grid sm:grid-cols-[minmax(0,1fr)_96px_auto] gap-2 items-start p-3 rounded-[var(--radius-md)] border border-border">
              <div className="space-y-2 min-w-0">
                <input className="input h-9 text-sm font-medium" placeholder="Criterion (e.g. Accuracy)" maxLength={120} value={c.title} onChange={(e) => setCrit(i, { title: e.target.value })} />
                <input className="input h-9 text-xs" placeholder="What a full score looks like (optional)" maxLength={1000} value={c.description} onChange={(e) => setCrit(i, { description: e.target.value })} />
              </div>
              <label className="text-xs text-muted">
                Points
                <input type="number" min={0.5} max={1000} step={0.5} className="input h-9 mt-0.5 text-right" value={c.maxPoints} onChange={(e) => setCrit(i, { maxPoints: Number(e.target.value) || 1 })} />
              </label>
              <button type="button" className="btn-ghost h-9 px-2 text-xs text-danger sm:mt-0" onClick={() => setF((x) => ({ ...x, rubric: x.rubric.filter((_, j) => j !== i) }))} aria-label={`Remove ${c.title || 'criterion'}`}>
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {f.rubric.length < 20 && (
              <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={() => setF((x) => ({ ...x, rubric: [...x.rubric, { id: '', title: '', description: '', maxPoints: 1 }] }))}>
                <NavIcon name="plus" size={15} /> Add criterion
              </button>
            )}
            {f.rubric.length > 0 && (
              <p className="text-xs text-muted">
                Rubric total {total} points{total !== maxMarks ? ` — scaled to ${maxMarks} marks` : ''}.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Reference answer (private)" icon={<NavIcon name="lock" size={16} />}>
        <textarea
          className="input min-h-36 text-sm"
          maxLength={20000}
          placeholder="Model answer or key points the work should include. Only staff (and the AI) see this."
          value={f.referenceAnswer}
          onChange={(e) => setF({ ...f, referenceAnswer: e.target.value })}
        />
      </Panel>

      <Panel title="AI" icon={<NavIcon name="sparkle" size={16} />}>
        <div className="space-y-3">
          <Toggle checked={f.aiEnabled} onChange={(v) => setF({ ...f, aiEnabled: v })} label="Allow AI suggestions for this assignment" description="Turn off for work the AI shouldn't read (e.g. personal reflections)." />
          <label className="block text-sm">
            <span className="font-medium">Guidance for the AI (optional)</span>
            <textarea
              className="input mt-1.5 min-h-24 text-sm"
              maxLength={4000}
              placeholder="e.g. Beginners — be encouraging. Don't take marks off for spelling."
              value={f.guidance}
              onChange={(e) => setF({ ...f, guidance: e.target.value })}
            />
          </label>
          <p className="text-xs text-muted">The AI never sees learners&apos; names or emails, and every suggestion waits for a mentor&apos;s approval.</p>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button type="button" className="btn-primary" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save setup'}
        </button>
      </div>
    </div>
  );
}
