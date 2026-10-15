// =============================================================================
// FILE: app/(app)/queries/[id]/ReplyForm.tsx
// Chat-style reply composer (client). Ctrl/⌘ + Enter sends.
// Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { replyAction } from '../actions';
import type { MessageAttachment } from '@/models/QueryMessage';
import { Alert, FileList, FileRow } from '@/components/ui';

export default function ReplyForm({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

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
    if (!body.trim()) {
      setError('Type a reply before sending.');
      return;
    }
    start(async () => {
      const res = await replyAction({ queryId, body, attachments });
      if (res.ok) {
        setBody('');
        setAttachments([]);
        setShowUpload(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-3 bg-surface border border-border rounded-[var(--radius-lg)] shadow-lg overflow-hidden"
    >
      {error && (
        <div className="px-4 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <label className="sr-only" htmlFor="reply-body">Reply</label>
      <textarea
        id="reply-body"
        className="block w-full min-h-[96px] max-h-72 resize-y px-4 pt-4 pb-2 bg-transparent text-sm text-text placeholder:text-muted outline-none"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
          }
        }}
        placeholder="Write your reply…"
      />

      {(attachments.length > 0 || showUpload) && (
        <div className="px-4 pb-3 space-y-2">
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
          {showUpload && (
            <FileUpload
              onUploaded={onFileUploaded}
              label="Attach file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-border bg-bg">
        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          aria-pressed={showUpload}
          className={`btn-ghost h-9 text-xs ${showUpload ? 'bg-hero' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
          </svg>
          Attach
          {attachments.length > 0 && (
            <span className="ml-0.5 px-1.5 rounded-full bg-primary text-primary-fg text-[10px] tabular-nums">
              {attachments.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-muted">Ctrl + Enter to send</span>
          <button
            type="submit"
            className="btn-primary h-9 px-4 inline-flex items-center gap-2"
            disabled={pending}
          >
            {pending ? 'Sending…' : 'Send reply'}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}