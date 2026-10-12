'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProgramAction, deleteProgramAction } from './actions';
import type { ProgramDetail } from '@/lib/programs';

type Props = {
  initial?: ProgramDetail;
};

function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ProgramForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: (initial?.status ?? 'active') as 'draft' | 'active' | 'archived',
    startDate: toDateInput(initial?.startDate),
    endDate: toDateInput(initial?.endDate),
  });

  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
    <form onSubmit={onSubmit} className="card space-y-4">
      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="label">Name</label>
        <input
          className="input"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[100px]"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as typeof form.status })
            }
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="label">Start date</label>
          <input
            className="input"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className="label">End date</label>
          <input
            className="input"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <div>
          {initial && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-danger">Delete permanently?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="btn-danger"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-outline text-danger border-danger"
              >
                Delete
              </button>
            )
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline"
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create program'}
          </button>
        </div>
      </div>
    </form>
  );
}