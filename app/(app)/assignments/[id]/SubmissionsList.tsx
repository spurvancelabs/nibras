'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { cloudinaryDownloadUrl } from '@/lib/cloudinary-url';
import { gradeSubmissionAction, ungradeSubmissionAction } from '../actions';
import type { RosterRow, SubmissionView } from '@/lib/submissions';

type Props = {
  assignmentId: string;
  maxMarks: number;
  dueAt: string;
  roster: RosterRow[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Submissions</h2>
        <p className="text-xs text-muted">
          {submitted.length}/{roster.length} submitted · {graded} graded
        </p>
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-muted">No students in this program.</p>
      ) : (
        <>
          {submitted.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted uppercase tracking-wide">
                Submitted
              </p>
              {submitted.map((r) => (
                <div
                  key={r.studentId}
                  className="border border-border rounded-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId(openId === r.studentId ? null : r.studentId)
                    }
                    className="w-full flex items-center gap-3 p-3 hover:bg-bg text-left"
                  >
                    <Avatar name={r.name} src={r.avatar} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted">
                        {r.submission!.gradedAt
                          ? `Graded · ${r.submission!.marks}/${maxMarks}`
                          : `Submitted ${fmt(r.submission!.submittedAt)}`}
                      </p>
                    </div>
                    {r.submission!.gradedAt ? (
                      <span className="badge-success">graded</span>
                    ) : (
                      <span className="badge-warning">to grade</span>
                    )}
                  </button>

                  {openId === r.studentId && (
                    <GradePanel
                      submission={r.submission!}
                      maxMarks={maxMarks}
                      assignmentId={assignmentId}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-1 pt-2">
              <p className="text-xs text-muted uppercase tracking-wide">
                Not submitted
              </p>
              {pending.map((r) => (
                <div
                  key={r.studentId}
                  className="flex items-center gap-3 p-3 border border-border rounded-md"
                >
                  <Avatar name={r.name} src={r.avatar} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted truncate">{r.email}</p>
                  </div>
                  <span className="badge-muted">pending</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
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
    <div className="p-3 border-t border-border bg-bg space-y-3">
      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {submission.text && (
        <div>
          <p className="text-xs text-muted mb-1">Answer</p>
          <p className="text-sm whitespace-pre-wrap">{submission.text}</p>
        </div>
      )}

      {submission.attachments.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-1">Files</p>
          <ul className="divide-y divide-border border border-border rounded-md bg-surface">
            {submission.attachments.map((a, i) => (
              <li key={i} className="flex items-center gap-2 p-2">
                <span className="truncate flex-1 text-sm">{a.originalName}</span>
                <a
                  href={cloudinaryDownloadUrl(a.url, a.originalName)}
                  className="text-xs hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-[120px_1fr] gap-3 items-start">
        <div>
          <label className="label">Marks</label>
          <input
            className="input"
            type="number"
            min={0}
            max={maxMarks}
            step={1}
            value={marks}
            onChange={(e) =>
              setMarks(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          <p className="text-xs text-muted mt-1">out of {maxMarks}</p>
        </div>
        <div>
          <label className="label">Feedback</label>
          <textarea
            className="input min-h-[80px]"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {submission.gradedAt && (
          <button
            type="button"
            onClick={ungrade}
            disabled={pending}
            className="btn-outline text-sm"
          >
            Un-grade
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary text-sm"
        >
          {pending ? 'Saving…' : submission.gradedAt ? 'Update grade' : 'Save grade'}
        </button>
      </div>
    </div>
  );
}