'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { createQueryAction } from './actions';
import type { MessageAttachment } from '@/models/QueryMessage';

type ProgramOption = { id: string; name: string };

type Props = {
  programs: ProgramOption[];
  presetSession: { id: string; title: string; programId: string } | null;
};

function formatBytes(n: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QueryForm({ programs, presetSession }: Props) {
  const router = useRouter();
  const [programId, setProgramId] = useState(
    presetSession?.programId ?? programs[0]?.id ?? ''
  );
  const [subject, setSubject] = useState(
    presetSession ? `Question about: ${presetSession.title}` : ''
  );
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

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
      const res = await createQueryAction({
        programId,
        sessionId: presetSession?.id ?? null,
        subject,
        body,
        attachments,
      });
      if (res.ok) {
        router.push(`/queries/${res.id}`);
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

      {presetSession && (
        <div className="text-xs text-muted px-3 py-2 rounded-md border border-border bg-bg">
          Linked to session: <strong>{presetSession.title}</strong>
        </div>
      )}

      <div>
        <label className="label">Program</label>
        <select
          className="input"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          required
        >
          <option value="" disabled>Select a program…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Subject</label>
        <input
          className="input"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short title for your question"
        />
      </div>

      <div>
        <label className="label">Your question</label>
        <textarea
          className="input min-h-[140px]"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe what you need help with…"
        />
      </div>

      <div>
        <label className="label">Attachments (optional)</label>
        <div className="space-y-2">
          {attachments.length > 0 && (
            <ul className="text-sm divide-y divide-border border border-border rounded-md">
              {attachments.map((a, i) => (
                <li key={i} className="flex items-center gap-2 p-2">
                  <span className="truncate flex-1">{a.originalName}</span>
                  <span className="text-xs text-muted">{formatBytes(a.size)}</span>
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
          <FileUpload
            onUploaded={onFileUploaded}
            label="Add file or image"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="btn-outline"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Posting…' : 'Post question'}
        </button>
      </div>
    </form>
  );
}