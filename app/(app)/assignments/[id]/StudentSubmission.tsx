'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { submitAssignmentAction } from '../actions';
import type { SubmissionView } from '@/lib/submissions';
import type { SubmissionState } from '@/lib/constants';

type Props = {
  assignmentId: string;
  maxMarks: number;
  dueAt: string;
  allowLate: boolean;
  submission: SubmissionView | null;
  state: SubmissionState;
};

function formatBytes(n: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentSubmission({
  assignmentId,
  maxMarks,
  dueAt,
  allowLate,
  submission,
  state,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!submission);
  const [text, setText] = useState(submission?.text ?? '');
  const [attachments, setAttachments] = useState(submission?.attachments ?? []);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const locked = submission?.gradedAt !== null && !!submission;
  const overdue = Date.now() > new Date(dueAt).getTime();
  const blockedByLate = overdue && !allowLate;

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
    if (!text.trim() && attachments.length === 0) {
      setError('Add some text or a file before submitting.');
      return;
    }
    start(async () => {
      const res = await submitAssignmentAction({
        assignmentId,
        text,
        attachments,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Your submission</h2>
        {submission && !editing && !locked && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-outline text-sm"
          >
            Edit submission
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {submission?.gradedAt && (
        <div className="rounded-md border border-border bg-bg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Grade</p>
            <p className="text-lg font-bold">
              {submission.marks} / {maxMarks}
            </p>
          </div>
          {submission.feedback && (
            <div>
              <p className="text-xs text-muted mb-1">Feedback</p>
              <p className="text-sm whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {locked && (
        <p className="text-xs text-muted">
          This submission has been graded and can no longer be changed.
        </p>
      )}

      {editing && !locked ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {blockedByLate && (
            <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200">
              The deadline has passed and late submissions aren't allowed.
            </div>
          )}

          <div>
            <label className="label">Your answer / notes (optional)</label>
            <textarea
              className="input min-h-[120px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your answer here…"
            />
          </div>

          <div>
            <label className="label">Files</label>
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
              <FileUpload
                onUploaded={onFileUploaded}
                label="Add file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {submission && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setText(submission.text);
                  setAttachments(submission.attachments);
                  setError('');
                }}
                className="btn-outline"
                disabled={pending}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={pending || blockedByLate}
            >
              {pending ? 'Submitting…' : submission ? 'Resubmit' : 'Submit'}
            </button>
          </div>
        </form>
      ) : (
        submission && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Submitted {new Date(submission.submittedAt).toLocaleString()}
              {submission.isLate && <span className="text-danger"> · late</span>}
            </p>

            {submission.text && (
              <div>
                <p className="text-xs text-muted mb-1">Answer</p>
                <p className="text-sm whitespace-pre-wrap">{submission.text}</p>
              </div>
            )}

            {submission.attachments.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Files</p>
                <ul className="divide-y divide-border border border-border rounded-md">
                  {submission.attachments.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 p-2">
                      <span className="truncate flex-1 text-sm">
                        {a.originalName}
                      </span>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={a.originalName || undefined}
                        className="text-xs hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}

      {!editing && !submission && (
        <p className="text-sm text-muted">
          You haven't submitted yet.{' '}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="underline"
          >
            Start
          </button>
        </p>
      )}
    </div>
  );
}