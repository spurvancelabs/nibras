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
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }
  if (format === 'pdf') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h1a1 1 0 0 1 0 2H9v2M14 13h2M14 17h2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Materials</h2>
        {canManage && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-outline text-sm"
          >
            + Add material
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Add form */}
      {canManage && adding && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-bg">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Kind</label>
              <select
                className="input"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as MaterialKind })
                }
              >
                {MATERIAL_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Session 3 slides"
              />
            </div>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input min-h-[60px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {form.kind === 'link' ? (
            <div>
              <label className="label">URL</label>
              <input
                className="input"
                value={form.externalUrl}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder="https://docs.google.com/…"
              />
            </div>
          ) : (
            <div>
              <label className="label">File</label>
              {form.file ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="truncate">{form.file.originalName}</span>
                  <span className="text-xs text-muted">
                    {formatBytes(form.file.bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, file: null, url: '' })}
                    className="text-xs text-muted hover:underline ml-auto"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <FileUpload onUploaded={onFileUploaded} label="Choose file" />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              disabled={pending}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="btn-primary"
            >
              {pending ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {materials.length === 0 ? (
        <p className="text-sm text-muted">
          No materials yet.{' '}
          {canManage ? 'Add slides or documents above.' : 'Check back later.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {materials.map((m) => (
            <li key={m.id} className="py-3 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-md bg-bg border border-border flex items-center justify-center text-muted">
                {iconFor(m.kind, m.format)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{m.title}</p>
                  {m.format && m.kind !== 'link' && (
                    <span className="badge-muted uppercase">{m.format}</span>
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
                  <Avatar name={m.uploadedByName} src={m.uploadedByAvatar} size={16} />
                  <span className="text-xs text-muted">{m.uploadedByName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {m.kind === 'link' ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-sm"
                  >
                    Open
                  </a>
                ) : (
                  <a
                    href={cloudinaryDownloadUrl(m.url, m.originalName)}
                    className="btn-outline text-sm"
                  >
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
                        className="btn-danger text-xs"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="btn-outline text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(m.id)}
                      className="btn-ghost text-xs text-danger"
                      aria-label="Delete"
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
    </div>
  );
}