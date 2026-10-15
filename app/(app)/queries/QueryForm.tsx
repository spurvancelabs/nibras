// =============================================================================
// FILE: app/(app)/queries/QueryForm.tsx
// New query form (client): program, subject, question, attachments.
// Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { createQueryAction } from './actions';
import type { MessageAttachment } from '@/models/QueryMessage';
import { Alert, FileList, FileRow, Icons } from '@/components/ui';

type ProgramOption = { id: string; name: string };

type Props = {
  programs: ProgramOption[];
  presetSession: { id: string; title: string; programId: string } | null;
};

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
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden"
    >
      <div className="p-5 sm:p-7 space-y-5">
        {error && <Alert>{error}</Alert>}

        {presetSession && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-hero">
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-surface">
              {Icons.calendar}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted">Linked to session</p>
              <p className="text-sm font-medium truncate">{presetSession.title}</p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="qf-program">Program</label>
            <select
              id="qf-program"
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
            <label className="label" htmlFor="qf-subject">Subject</label>
            <input
              id="qf-subject"
              className="input"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short title for your question"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="qf-body">Your question</label>
          <textarea
            id="qf-body"
            className="input min-h-[180px]"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe what you need help with — what you tried, what happened, and what you expected…"
          />
        </div>

        <div className="space-y-2">
          <p className="label">Attachments (optional)</p>
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
          <FileUpload
            onUploaded={onFileUploaded}
            label="Add file or image"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 sm:px-7 py-4 border-t border-border bg-bg">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="btn-outline h-11"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary h-11 px-6 inline-flex items-center justify-center gap-2" disabled={pending}>
          {Icons.chat}
          {pending ? 'Posting…' : 'Post question'}
        </button>
      </div>
    </form>
  );
}