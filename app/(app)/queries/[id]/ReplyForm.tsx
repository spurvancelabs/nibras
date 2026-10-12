'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { replyAction } from '../actions';
import type { MessageAttachment } from '@/models/QueryMessage';

function formatBytes(n: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReplyForm({ queryId }: { queryId: string }) {
  const router = useRouter();
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
    if (!body.trim()) {
      setError('Type a reply before sending.');
      return;
    }
    start(async () => {
      const res = await replyAction({ queryId, body, attachments });
      if (res.ok) {
        setBody('');
        setAttachments([]);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="label">Reply</label>
        <textarea
          className="input min-h-[100px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply…"
        />
      </div>

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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FileUpload
          onUploaded={onFileUploaded}
          label="Attach file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}