// =============================================================================
// FILE: app/(app)/admin/programs/ProgramForm.tsx
// Create / edit program form (client).
// NEW: status as cards with explanations, description counter, date check
//      (end must be after start) and a live duration hint.
// Save / delete logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProgramAction, deleteProgramAction } from './actions';
import type { ProgramDetail } from '@/lib/programs';
import { Alert, Icons } from '@/components/ui';

type Props = {
  initial?: ProgramDetail;
};

type Status = 'draft' | 'active' | 'archived';

const STATUS_OPTIONS: { value: Status; label: string; hint: string; dot: string }[] = [
  { value: 'draft', label: 'Draft', hint: 'Being set up. Hidden from new sessions.', dot: 'bg-warning' },
  { value: 'active', label: 'Active', hint: 'Running. Members can use everything.', dot: 'bg-success' },
  { value: 'archived', label: 'Archived', hint: 'Finished. Kept read-only for history.', dot: 'bg-muted' },
];

const DESC_MAX = 2000;

function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function durationLabel(start: string, end: string) {
  if (!start || !end) return '';
  const days = Math.round((+new Date(end) - +new Date(start)) / 86400000) + 1;
  if (days <= 0) return '';
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  if (weeks === 0) return `${days} day${days === 1 ? '' : 's'}`;
  return `${weeks} week${weeks === 1 ? '' : 's'}${rest ? ` ${rest} day${rest === 1 ? '' : 's'}` : ''} (${days} days)`;
}

export default function ProgramForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: (initial?.status ?? 'active') as Status,
    startDate: toDateInput(initial?.startDate),
    endDate: toDateInput(initial?.endDate),
  });

  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const datesInvalid =
    !!form.startDate && !!form.endDate && form.endDate < form.startDate;
  const duration = datesInvalid ? '' : durationLabel(form.startDate, form.endDate);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (datesInvalid) {
      setError('End date must be on or after the start date.');
      return;
    }
    start(async () => {
      const res = await saveProgramAction({
        id: initial?.id,
        name: form.name,
        description: form.description,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      if (res.ok) {
        router.push(
          res.id ? `/admin/programs/${res.id}` : '/admin/programs'
        );
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    start(async () => {
      const res = await deleteProgramAction({ id: initial.id });
      if (res.ok) {
        router.push('/admin/programs');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden"
    >
      <div className="p-5 sm:p-7 space-y-6">
        {error && <Alert>{error}</Alert>}

        <div>
          <label className="label" htmlFor="pf-name">Name</label>
          <input
            id="pf-name"
            className="input h-11 text-base"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Cyber Security Fellowship — Cohort 3"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="pf-desc">Description</label>
            <span className={`text-[11px] tabular-nums ${form.description.length > DESC_MAX * 0.9 ? 'text-warning' : 'text-muted'}`}>
              {form.description.length}/{DESC_MAX}
            </span>
          </div>
          <textarea
            id="pf-desc"
            className="input min-h-[120px]"
            maxLength={DESC_MAX}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Who it's for, what it covers, expected outcomes…"
          />
        </div>

        {/* Status cards */}
        <fieldset>
          <legend className="label">Status</legend>
          <div className="grid sm:grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((o) => {
              const active = form.status === o.value;
              return (
                <label
                  key={o.value}
                  className={`relative flex flex-col gap-1 p-3.5 rounded-[var(--radius-md)] border cursor-pointer transition ${
                    active ? 'border-primary bg-hero ring-1 ring-primary' : 'border-border hover:bg-hero/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={o.value}
                    checked={active}
                    onChange={() => setForm({ ...form, status: o.value })}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`w-2 h-2 rounded-full ${o.dot}`} />
                    {o.label}
                  </span>
                  <span className="text-xs text-muted leading-snug">{o.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Dates */}
        <div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="pf-start">Start date</label>
              <input
                id="pf-start"
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="pf-end">End date</label>
              <input
                id="pf-end"
                className={`input ${datesInvalid ? 'border-danger' : ''}`}
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                aria-invalid={datesInvalid}
              />
            </div>
          </div>
          {datesInvalid ? (
            <p className="mt-2 text-xs text-danger">End date must be on or after the start date.</p>
          ) : duration ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
              {Icons.clock}
              Duration: {duration}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">Both dates are optional.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-7 py-4 border-t border-border bg-bg">
        <div>
          {initial && (
            confirmDelete ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  className="input h-10 sm:w-56 text-sm"
                  placeholder="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  aria-label="Type DELETE to confirm deletion"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={pending || confirmText.trim().toUpperCase() !== 'DELETE'}
                    className="btn-danger h-10"
                  >
                    Delete permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      setConfirmText('');
                    }}
                    className="btn-outline h-10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost text-danger"
              >
                Delete program
              </button>
            )
          )}
        </div>

        <div className="flex gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline flex-1 sm:flex-none h-11"
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none h-11 px-6" disabled={pending || datesInvalid}>
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create program'}
          </button>
        </div>
      </div>
    </form>
  );
}