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
    <div className="flex items-center gap-2 flex-wrap">
      {error && (
        <span className="text-xs text-danger">{error}</span>
      )}

      <button
        type="button"
        onClick={toggleStatus}
        disabled={pending}
        className="btn-outline text-sm"
      >
        {status === 'open' ? 'Mark resolved' : 'Reopen'}
      </button>

      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="btn-danger text-xs"
          >
            Confirm delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="btn-outline text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="btn-ghost text-xs text-danger"
        >
          Delete
        </button>
      )}
    </div>
  );
}