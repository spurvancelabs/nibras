// =============================================================================
// FILE: app/(app)/queries/[id]/StatusActions.tsx
// Resolve / Reopen and Delete (with inline confirm) for a query thread.
// Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStatusAction, deleteQueryAction } from '../actions';
import type { QueryStatus } from '@/lib/constants';

type Props = {
  queryId: string;
  status: QueryStatus;
  canManage: boolean;
};

export default function StatusActions({ queryId, status, canManage }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleStatus() {
    setError('');
    const next: QueryStatus = status === 'open' ? 'resolved' : 'open';
    start(async () => {
      const res = await setStatusAction({ queryId, status: next });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function onDelete() {
    setError('');
    start(async () => {
      const res = await deleteQueryAction({ queryId });
      if (res.ok) {
        router.push('/queries');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!canManage) return null;

  return (
    <div className="flex flex-col items-stretch md:items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={pending}
          className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-sm font-medium transition disabled:opacity-50 ${
            status === 'open'
              ? 'bg-success text-white hover:opacity-90'
              : 'border border-border bg-surface hover:bg-hero'
          }`}
        >
          {status === 'open' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
            </svg>
          )}
          {pending ? 'Working…' : status === 'open' ? 'Mark resolved' : 'Reopen'}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="btn-danger text-xs h-10"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="btn-outline text-xs h-10"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost h-10 w-10 p-0 text-danger"
            aria-label="Delete thread"
            title="Delete thread"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </div>

      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}