// =============================================================================
// FILE: app/(app)/sessions/[id]/MaterialsPanel.tsx
// Session materials (client): list with download/open, add form (file or link),
// delete with inline confirm. Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import {
  createMaterialAction,
  deleteMaterialAction,
} from './materials/actions';
import { MATERIAL_KINDS, type MaterialKind } from '@/lib/constants';
import type { MaterialItem } from '@/lib/materials';
import { Panel, Alert, EmptyNote, Icons } from '@/components/ui';

type Props = {
  sessionId: string;
  materials: MaterialItem[];
  canManage: boolean;
};

function formatBytes(n: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(kind: MaterialKind, format: string) {
  if (kind === 'link') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }
  if (format === 'pdf') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h1a1 1 0 0 1 0 2H9v2M14 13h2M14 17h2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

export default function MaterialsPanel({ sessionId, materials, canManage }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'slide' as MaterialKind,
    url: '',
    externalUrl: '',
    file: null as UploadedFile | null,
  });

  function resetForm() {
    setForm({
      title: '',
      description: '',
      kind: 'slide',
      url: '',
      externalUrl: '',
      file: null,
    });
    setError('');
  }

  function onFileUploaded(file: UploadedFile) {
    setForm((f) => ({
      ...f,
      file,
      title: f.title || file.originalName.replace(/\.[^.]+$/, ''),
      url: file.url,
    }));
  }

  function submit() {
    setError('');
    const url = form.kind === 'link' ? form.externalUrl : form.url;
    if (!form.title.trim()) return setError('Title is required');
    if (!url) return setError('File or URL is required');

    start(async () => {
      const payload = {
        sessionId,
        title: form.title.trim(),
        description: form.description,
        kind: form.kind,
        url,
        publicId: form.kind === 'link' ? '' : form.file?.publicId ?? '',
        resourceType: form.kind === 'link' ? 'image' : form.file?.resourceType ?? 'image',
        format: form.kind === 'link' ? 'link' : form.file?.format ?? '',
        size: form.kind === 'link' ? 0 : form.file?.bytes ?? 0,
        originalName: form.kind === 'link' ? '' : form.file?.originalName ?? '',
      };
      const res = await createMaterialAction(payload);
      if (res.ok) {
        resetForm();
        setAdding(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    setError('');
    start(async () => {
      const res = await deleteMaterialAction({ id });
      if (res.ok) {
        setDeletingId(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          Materials
          {materials.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-hero text-[11px] font-semibold tabular-nums">
              {materials.length}
            </span>
          )}
        </span>
      }
      icon={Icons.file}
      bodyClassName="p-0"
      action={
        canManage && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-outline text-xs h-8 inline-flex items-center gap-1.5"
          >
            {Icons.plus}
            Add material
          </button>
        )
      }
    >
      {error && (
        <div className="px-5 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Add form */}
      {canManage && adding && (
        <div className="m-4 sm:m-5 p-4 sm:p-5 space-y-4 rounded-[var(--radius-md)] border border-border bg-bg">
          <div>
            <p className="label">Kind</p>
            <div role="radiogroup" aria-label="Material kind" className="flex flex-wrap gap-2">
              {MATERIAL_KINDS.map((k) => {
                const active = form.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, kind: k as MaterialKind })}
                    className={`h-9 px-3.5 rounded-full border text-xs font-medium capitalize transition ${
                      active
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'bg-surface border-border text-muted hover:text-text'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="mat-title">Title</label>
            <input
              id="mat-title"
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Session 3 slides"
            />
          </div>

          <div>
            <label className="label" htmlFor="mat-desc">Description (optional)</label>
            <textarea
              id="mat-desc"
              className="input min-h-[60px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {form.kind === 'link' ? (
            <div>
              <label className="label" htmlFor="mat-url">URL</label>
              <input
                id="mat-url"
                className="input"
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://docs.google.com/…"
              />
            </div>
          ) : (
            <div>
              <p className="label">File</p>
              {form.file ? (
                <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-surface text-sm">
                  <span className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-hero">
                    {iconFor(form.kind, form.file.format)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{form.file.originalName}</span>
                    <span className="block text-xs text-muted">{formatBytes(form.file.bytes)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, file: null, url: '' })}
                    className="btn-ghost text-xs"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <FileUpload onUploaded={onFileUploaded} label="Choose file" />
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              disabled={pending}
              className="btn-outline h-10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="btn-primary h-10 px-5"
            >
              {pending ? 'Saving…' : 'Add material'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {materials.length === 0 ? (
        <EmptyNote
          compact
          icon={Icons.file}
          title="No materials yet."
          text={canManage ? 'Add slides or documents above.' : 'Check back later.'}
        />
      ) : (
        <ul className="divide-y divide-border">
          {materials.map((m) => (
            <li key={m.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="shrink-0 grid place-items-center w-11 h-11 rounded-[var(--radius-md)] bg-hero text-text">
                  {iconFor(m.kind, m.format)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate max-w-full">{m.title}</p>
                    {m.format && m.kind !== 'link' && (
                      <span className="px-1.5 py-0.5 rounded bg-bg border border-border text-[10px] font-semibold uppercase text-muted">
                        {m.format}
                      </span>
                    )}
                    {m.size > 0 && (
                      <span className="text-xs text-muted">{formatBytes(m.size)}</span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar name={m.uploadedByName} src={m.uploadedByAvatar} size={18} />
                    <span className="text-xs text-muted truncate">{m.uploadedByName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:pl-0 pl-14">
                {m.kind === 'link' ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-sm h-9 inline-flex items-center gap-1.5"
                  >
                    {Icons.link}
                    Open
                  </a>
                ) : (
                  <a
                    href={cloudinaryDownloadUrl(m.url, m.originalName)}
                    className="btn-outline text-sm h-9 inline-flex items-center gap-1.5"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download
                  </a>
                )}

                {canManage && (
                  deletingId === m.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        disabled={pending}
                        className="btn-danger text-xs h-9"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="btn-outline text-xs h-9"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(m.id)}
                      className="btn-ghost text-danger h-9 w-9 grid place-items-center p-0"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}