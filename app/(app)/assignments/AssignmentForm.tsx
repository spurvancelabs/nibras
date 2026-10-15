// =============================================================================
// FILE: app/(app)/assignments/AssignmentForm.tsx
// Create / edit assignment form (client). Logic unchanged — layout redesigned
// into sections (Details, Deadline & marks, Reference files).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { saveAssignmentAction, deleteAssignmentAction } from './actions';
import type { AssignmentAttachment, AssignmentListItem } from '@/lib/assignments';
import { Alert, FileList, FileRow, Icons } from '@/components/ui';

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

function FormSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4 md:gap-8 py-6 first:pt-0 last:pb-0">
      <div className="flex md:flex-col gap-3 md:gap-2">
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-hero text-text">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4 min-w-0">{children}</div>
    </div>
  );
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
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden"
    >
      <div className="p-5 sm:p-7 space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="divide-y divide-border">
          {/* Details */}
          <FormSection icon={Icons.clipboard} title="Details" hint="What students need to do.">
            <div>
              <label className="label" htmlFor="af-program">Program</label>
              <select
                id="af-program"
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
              <label className="label" htmlFor="af-title">Title</label>
              <input
                id="af-title"
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Lab 2 — Packet capture report"
              />
            </div>

            <div>
              <label className="label" htmlFor="af-desc">Description</label>
              <textarea
                id="af-desc"
                className="input min-h-[140px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What students need to do…"
              />
            </div>
          </FormSection>

          {/* Deadline & marks */}
          <FormSection icon={Icons.clock} title="Deadline & marks">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="af-due">Due at</label>
                <input
                  id="af-due"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.dueAt}
                  onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="af-marks">Max marks</label>
                <input
                  id="af-marks"
                  className="input"
                  type="number"
                  min={1}
                  required
                  value={form.maxMarks}
                  onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Toggle switch (same checkbox underneath) */}
            <label className="flex items-center justify-between gap-4 p-3.5 rounded-[var(--radius-md)] border border-border bg-bg cursor-pointer">
              <span>
                <span className="block text-sm font-medium">Allow late submissions</span>
                <span className="block text-xs text-muted">
                  Students can still submit after the deadline (marked as late).
                </span>
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.allowLate}
                  onChange={(e) => setForm({ ...form, allowLate: e.target.checked })}
                />
                <span className="w-11 h-6 rounded-full bg-border peer-checked:bg-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
                <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </FormSection>

          {/* Attachments */}
          <FormSection icon={Icons.file} title="Reference files" hint="Optional handouts, templates or datasets.">
            {attachments.length > 0 && (
              <FileList>
                {attachments.map((a, i) => (
                  <FileRow key={i} name={a.originalName} size={a.size} format={a.format}>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="btn-ghost text-xs text-danger"
                    >
                      Remove
                    </button>
                  </FileRow>
                ))}
              </FileList>
            )}
            <FileUpload onUploaded={onFileUploaded} label="Add attachment" />
          </FormSection>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-7 py-4 border-t border-border bg-bg">
        <div>
          {initial && canDelete && (
            confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-danger font-medium">Delete this assignment?</span>
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
                className="btn-ghost text-danger"
              >
                Delete assignment
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
          <button type="submit" className="btn-primary flex-1 sm:flex-none h-11 px-6" disabled={pending}>
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create assignment'}
          </button>
        </div>
      </div>
    </form>
  );
}