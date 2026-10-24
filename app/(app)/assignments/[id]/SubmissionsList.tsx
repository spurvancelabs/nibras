// =============================================================================
// FILE: app/(app)/assignments/[id]/SubmissionsList.tsx
// Mentor/admin submissions list (client): progress summary, expandable rows
// with grading panel, and "not submitted" list. Logic unchanged.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import { gradeSubmissionAction, ungradeSubmissionAction } from '../actions';
import type { RosterRow, SubmissionView } from '@/lib/submissions';
import {
  Panel,
  Badge,
  Alert,
  EmptyNote,
  FileList,
  FileRow,
  DownloadIcon,
  Icons,
} from '@/components/ui';
import { formatDateTime } from '@/lib/time';

type Props = {
  assignmentId: string;
  maxMarks: number;
  dueAt: string;
  roster: RosterRow[];
};

function fmt(iso: string) {
  return formatDateTime(iso);
}

export default function SubmissionsList({
  assignmentId,
  maxMarks,
  dueAt,
  roster,
}: Props) {
  const submitted = roster.filter((r) => r.submitted);
  const pending = roster.filter((r) => !r.submitted);
  const graded = submitted.filter((r) => r.submission?.gradedAt).length;

  const [openId, setOpenId] = useState<string | null>(null);

  const subPct = roster.length ? (submitted.length / roster.length) * 100 : 0;
  const gradedPct = roster.length ? (graded / roster.length) * 100 : 0;

  return (
    <Panel title="Submissions" icon={Icons.users} bodyClassName="p-0">
      {/* Summary */}
      <div className="px-5 py-4 border-b border-border bg-bg space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{submitted.length}/{roster.length} submitted</Badge>
          <Badge tone="success">{graded} graded</Badge>
          {submitted.length - graded > 0 && (
            <Badge tone="warning">{submitted.length - graded} to grade</Badge>
          )}
          {pending.length > 0 && <Badge tone="muted">{pending.length} not submitted</Badge>}
        </div>
        <div className="relative h-2 rounded-full bg-hero overflow-hidden" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${subPct}%` }} />
          <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${gradedPct}%` }} />
        </div>
      </div>

      {roster.length === 0 ? (
        <EmptyNote compact icon={Icons.users} title="No students in this program." />
      ) : (
        <div className="p-4 sm:p-5 space-y-6">
          {submitted.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Submitted
              </p>
              {submitted.map((r) => {
                const open = openId === r.studentId;
                const isGraded = !!r.submission!.gradedAt;
                return (
                  <div
                    key={r.studentId}
                    className={`rounded-[var(--radius-md)] border overflow-hidden transition ${
                      open ? 'border-primary shadow-sm' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenId(openId === r.studentId ? null : r.studentId)
                      }
                      aria-expanded={open}
                      className="w-full flex items-center gap-3 p-3 hover:bg-hero/40 text-left transition"
                    >
                      <Avatar name={r.name} src={r.avatar} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted truncate">
                          {isGraded
                            ? `Graded · ${r.submission!.marks}/${maxMarks}`
                            : `Submitted ${fmt(r.submission!.submittedAt)}`}
                          {r.submission!.isLate && <span className="text-danger"> · late</span>}
                        </p>
                      </div>
                      {isGraded ? (
                        <Badge tone="success" dot>graded</Badge>
                      ) : (
                        <Badge tone="warning" dot>to grade</Badge>
                      )}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {open && (
                      <GradePanel
                        submission={r.submission!}
                        maxMarks={maxMarks}
                        assignmentId={assignmentId}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Not submitted
              </p>
              <div className="rounded-[var(--radius-md)] border border-border divide-y divide-border overflow-hidden">
                {pending.map((r) => (
                  <div key={r.studentId} className="flex items-center gap-3 p-3">
                    <Avatar name={r.name} src={r.avatar} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted truncate">{r.email}</p>
                    </div>
                    <Badge tone={new Date(dueAt).getTime() < Date.now() ? 'danger' : 'muted'}>
                      {new Date(dueAt).getTime() < Date.now() ? 'missing' : 'pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function GradePanel({
  submission,
  maxMarks,
  assignmentId,
}: {
  submission: SubmissionView;
  maxMarks: number;
  assignmentId: string;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState<number | ''>(
    submission.marks ?? ''
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function save() {
    setError('');
    if (marks === '' || isNaN(Number(marks))) {
      setError('Enter marks');
      return;
    }
    start(async () => {
      const res = await gradeSubmissionAction({
        submissionId: submission.id,
        marks: Number(marks),
        feedback,
      });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function ungrade() {
    setError('');
    start(async () => {
      const res = await ungradeSubmissionAction({ submissionId: submission.id });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="p-4 border-t border-border bg-bg space-y-4" data-assignment={assignmentId}>
      {error && <Alert>{error}</Alert>}

      {submission.text && (
        <div>
          <p className="text-xs text-muted mb-1">Answer</p>
          <div className="p-3.5 rounded-[var(--radius-md)] bg-surface border border-border max-h-72 overflow-y-auto">
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

      <div className="grid sm:grid-cols-[150px_1fr] gap-4 items-start">
        <div>
          <label className="label" htmlFor={`marks-${submission.id}`}>Marks</label>
          <div className="relative">
            <input
              id={`marks-${submission.id}`}
              className="input pr-12 text-lg font-semibold tabular-nums"
              type="number"
              min={0}
              max={maxMarks}
              step={1}
              value={marks}
              onChange={(e) =>
                setMarks(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              /{maxMarks}
            </span>
          </div>
          {/* Quick-fill shortcuts (just set the input value) */}
          <div className="mt-2 flex flex-wrap gap-1">
            {[1, 0.75, 0.5].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setMarks(Math.round(maxMarks * f))}
                className="px-2 py-0.5 rounded-full border border-border text-[11px] text-muted hover:text-text hover:bg-surface transition"
              >
                {Math.round(f * 100)}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor={`fb-${submission.id}`}>Feedback</label>
          <textarea
            id={`fb-${submission.id}`}
            className="input min-h-[96px]"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What went well, what to improve…"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {submission.gradedAt && (
          <button
            type="button"
            onClick={ungrade}
            disabled={pending}
            className="btn-outline text-sm h-10"
          >
            Un-grade
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary text-sm h-10 px-5"
        >
          {pending ? 'Saving…' : submission.gradedAt ? 'Update grade' : 'Save grade'}
        </button>
      </div>
    </div>
  );
}