// =============================================================================
// FILE: app/(app)/admin/programs/[id]/ProgramQuickActions.tsx   (NEW FILE)
// Header actions for a program: quick status switch (Draft / Active /
// Archived) and "Duplicate" (copies details + chosen members into a new draft).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProgramStatusAction, duplicateProgramAction } from '../actions';

type Status = 'draft' | 'active' | 'archived';

const STATUSES: { value: Status; label: string; dot: string }[] = [
  { value: 'draft', label: 'Draft', dot: 'bg-warning' },
  { value: 'active', label: 'Active', dot: 'bg-success' },
  { value: 'archived', label: 'Archived', dot: 'bg-muted' },
];

export default function ProgramQuickActions({
  programId,
  status,
}: {
  programId: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [dupOpen, setDupOpen] = useState(false);
  const [withMentors, setWithMentors] = useState(true);
  const [withStudents, setWithStudents] = useState(false);

  function changeStatus(next: Status) {
    if (next === status) return;
    setError('');
    start(async () => {
      const res = await setProgramStatusAction({ id: programId, status: next });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function duplicate() {
    setError('');
    start(async () => {
      const res = await duplicateProgramAction({
        id: programId,
        includeMentors: withMentors,
        includeStudents: withStudents,
      });
      if (res.ok && res.id) {
        router.push(`/admin/programs/${res.id}`);
        router.refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch lg:items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status segmented control */}
        <div
          role="radiogroup"
          aria-label="Program status"
          className="inline-flex p-1 rounded-[var(--radius-md)] bg-surface/90 border border-border"
        >
          {STATUSES.map((s) => {
            const active = status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => changeStatus(s.value)}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium transition disabled:opacity-60 ${
                  active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setDupOpen((v) => !v)}
          aria-expanded={dupOpen}
          className="h-10 px-3.5 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface/90 text-sm font-medium hover:bg-surface transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Duplicate
        </button>
      </div>

      {dupOpen && (
        <div className="w-full lg:w-80 p-4 rounded-[var(--radius-md)] bg-surface border border-border shadow-lg space-y-3 text-left">
          <p className="text-sm font-semibold">Duplicate program</p>
          <p className="text-xs text-muted">
            Creates a new <b>draft</b> with the same name (+ “copy”), description and dates.
          </p>
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={withMentors} onChange={(e) => setWithMentors(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
            Copy mentors
          </label>
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={withStudents} onChange={(e) => setWithStudents(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
            Copy students
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setDupOpen(false)} className="btn-outline h-9 text-sm">
              Cancel
            </button>
            <button type="button" onClick={duplicate} disabled={pending} className="btn-primary h-9 text-sm">
              {pending ? 'Copying…' : 'Create copy'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}