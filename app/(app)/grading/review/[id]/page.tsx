// =============================================================================
// FILE: app/(app)/grading/review/[id]/page.tsx   (NEW FILE)
// Review one submission: the learner's work on the left, grading on the
// right (AI suggestion with per-criterion scores, confidence and flags —
// or manual grading). Approve, edit, reject, or ask the AI again.
// =============================================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth-helpers';
import { getReview, aiStatus } from '@/lib/grading';
import { PageHeader, Panel, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/time';
import ReviewForm from './ReviewForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Review submission' };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('grading.review');
  const { id } = await params;
  const [r, ai] = await Promise.all([getReview(user, id), aiStatus(user.orgId)]);
  if (!r) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/grading?assignment=${r.assignment.id}`, label: 'Grading queue' }}
        eyebrow={r.assignment.title}
        title={r.submission.studentName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Submitted {formatDateTime(r.submission.submittedAt)}
            {r.submission.late && <Badge tone="warning">late</Badge>}
            {r.submission.marks !== null && <Badge tone="success">graded {r.submission.marks}/{r.assignment.maxMarks}</Badge>}
          </span>
        }
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <Panel title="Learner's work">
            {r.submission.text.trim() ? (
              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed max-h-[70vh] overflow-y-auto">{r.submission.text}</div>
            ) : (
              <p className="text-sm text-muted">No text — see the attachments.</p>
            )}
            {r.submission.attachments.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {r.submission.attachments.map((a, i) => (
                  <li key={i}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-outline h-9 px-3 text-xs">
                      📎 {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <details className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
            <summary className="cursor-pointer font-semibold text-sm">Assignment brief</summary>
            <p className="mt-3 text-sm whitespace-pre-wrap text-muted">{r.assignment.description || 'No description.'}</p>
          </details>
        </div>
        <div className="lg:sticky lg:top-24 min-w-0">
          <ReviewForm data={r} aiAvailable={ai.available} aiReason={ai.reason} />
        </div>
      </div>
    </div>
  );
}
