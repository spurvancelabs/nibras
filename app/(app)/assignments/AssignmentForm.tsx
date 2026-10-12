'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { saveAssignmentAction, deleteAssignmentAction } from './actions';
import type { AssignmentAttachment, AssignmentListItem } from '@/lib/assignments';

type ProgramOption = { id: string; name: string };

type Props = {
  programs: ProgramOption[];
  initial?: AssignmentListItem;
  canDelete?: boolean;
};

function isoToLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

function formatBytes(n: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssignmentForm({ programs, initial, canDelete }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    programId: initial?.programId ?? programs[0]?.id ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    dueAt: isoToLocal(initial?.dueAt),
    maxMarks: initial?.maxMarks ?? 100,
    allowLate: initial?.allowLate ?? true,
  });
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>(
    initial?.attachments ?? []
  );

  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onFileUploaded(file: UploadedFile) {
    setAttachments((prev) => [
      ...prev,
      {
        url: file.url,
        publicId: file.publicId,
        resourceType: file.resourceType,
        format: file.format,
        size: file.bytes,
        originalName: file.originalName,
      },
    ]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    start(async () => {
      const res = await saveAssignmentAction({
        id: initial?.id,
        programId: form.programId,
        title: form.title,
        description: form.description,
        dueAt: localToIso(form.dueAt),
        maxMarks: Number(form.maxMarks),
        allowLate: form.allowLate,
        attachments,
      });
      if (res.ok) {
        router.push(res.id ? `/assignments/${res.id}` : '/assignments');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    start(async () => {
      const res = await deleteAssignmentAction({ id: initial.id });
      if (res.ok) {
        router.push('/assignments');
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
        <label className="label">Program</label>
        <select
          className="input"
          value={form.programId}
          onChange={(e) => setForm({ ...form, programId: e.target.value })}
          required
        >
          <option value="" disabled>Select a program…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Title</label>
        <input
          className="input"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[120px]"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What students need to do…"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Due at</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Max marks</label>
          <input
            className="input"
            type="number"
            min={1}
            required
            value={form.maxMarks}
            onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.allowLate}
          onChange={(e) => setForm({ ...form, allowLate: e.target.checked })}
        />
        Allow late submissions
      </label>

      <div>
        <label className="label">Reference attachments (optional)</label>
        <div className="space-y-2">
          {attachments.length > 0 && (
            <ul className="text-sm divide-y divide-border border border-border rounded-md">
              {attachments.map((a, i) => (
                <li key={i} className="flex items-center gap-2 p-2">
                  <span className="truncate flex-1">{a.originalName}</span>
                  <span className="text-xs text-muted">
                    {formatBytes(a.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <FileUpload onUploaded={onFileUploaded} label="Add attachment" />
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <div>
          {initial && canDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-danger">Delete?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="btn-danger"
                >
                  Yes
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
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create assignment'}
          </button>
        </div>
      </div>
    </form>
  );
}