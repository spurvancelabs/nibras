// =============================================================================
// FILE: app/(app)/assignments/[id]/StudentSubmission.tsx
// Student's submission panel (client): grade card, submit / resubmit form,
// submitted view. Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import { submitAssignmentAction } from '../actions';
import type { SubmissionView } from '@/lib/submissions';
import type { SubmissionState } from '@/lib/constants';
import {
  Panel,
  Alert,
  EmptyNote,
  FileList,
  FileRow,
  DownloadIcon,
  ProgressRing,
  Icons,
} from '@/components/ui';

type Props = {
  assignmentId: string;
  maxMarks: number;
  dueAt: string;
  allowLate: boolean;
  submission: SubmissionView | null;
  state: SubmissionState;
};

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

  const gradePct =
    submission?.gradedAt && submission.marks != null && maxMarks > 0
      ? submission.marks / maxMarks
      : 0;

  return (
    <Panel
      title="Your submission"
      icon={Icons.check}
      action={
        submission && !editing && !locked ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-outline text-xs h-8 inline-flex items-center gap-1.5"
          >
            {Icons.edit}
            Edit submission
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}

        {/* Grade card */}
        {submission?.gradedAt && (
          <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-[var(--radius-md)] bg-hero">
            <ProgressRing
              value={gradePct}
              size={88}
              label={
                <span className="text-center leading-tight">
                  <span className="block text-base">{submission.marks}</span>
                  <span className="block text-[10px] text-muted">/ {maxMarks}</span>
                </span>
              }
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Grade</p>
              <p className="text-2xl font-semibold tabular-nums">
                {submission.marks} / {maxMarks}
              </p>
              {submission.feedback && (
                <div className="mt-3">
                  <p className="text-xs text-muted mb-1">Feedback</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {locked && (
          <p className="inline-flex items-center gap-2 text-xs text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            This submission has been graded and can no longer be changed.
          </p>
        )}

        {editing && !locked ? (
          <form onSubmit={onSubmit} className="space-y-4">
            {blockedByLate && (
              <Alert>The deadline has passed and late submissions aren&apos;t allowed.</Alert>
            )}
            {overdue && allowLate && !blockedByLate && (
              <Alert tone="info">The deadline has passed — your submission will be marked late.</Alert>
            )}

            <div>
              <label className="label" htmlFor="ss-text">Your answer / notes (optional)</label>
              <textarea
                id="ss-text"
                className="input min-h-[140px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your answer here…"
              />
            </div>

            <div className="space-y-2">
              <p className="label">Files</p>
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
                label="Add file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,image/*"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              {submission && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setText(submission.text);
                    setAttachments(submission.attachments);
                    setError('');
                  }}
                  className="btn-outline h-11"
                  disabled={pending}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-primary h-11 px-6"
                disabled={pending || blockedByLate}
              >
                {pending ? 'Submitting…' : submission ? 'Resubmit' : 'Submit'}
              </button>
            </div>
          </form>
        ) : (
          submission && (
            <div className="space-y-4">
              <p className="inline-flex flex-wrap items-center gap-2 text-xs text-muted">
                {Icons.clock}
                Submitted {new Date(submission.submittedAt).toLocaleString()}
                {submission.isLate && (
                  <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger font-semibold">late</span>
                )}
              </p>

              {submission.text && (
                <div>
                  <p className="text-xs text-muted mb-1">Answer</p>
                  <div className="p-4 rounded-[var(--radius-md)] bg-bg border border-border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.text}</p>
                  </div>
                </div>
              )}

              {submission.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1">Files</p>
                  <FileList>
                    {submission.attachments.map((a, i) => (
                      <FileRow key={i} name={a.originalName} size={a.size} format={a.format}>
                        <a
                          href={cloudinaryDownloadUrl(a.url, a.originalName)}
                          className="btn-ghost h-8 text-xs"
                        >
                          {DownloadIcon}
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </FileRow>
                    ))}
                  </FileList>
                </div>
              )}
            </div>
          )
        )}

        {!editing && !submission && (
          <EmptyNote
            compact
            icon={Icons.clipboard}
            title="You haven't submitted yet."
            text={state === 'overdue' ? 'This assignment is overdue.' : undefined}
            action={
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-primary h-10 px-5"
              >
                Start submission
              </button>
            }
          />
        )}
      </div>
    </Panel>
  );
}