// =============================================================================
// FILE: app/(app)/grading/page.tsx   (NEW FILE)
// Grading queue for mentors (their programs) and admins (all programs):
// ungraded work oldest-first, AI suggestions that need attention on top,
// batch "Ask AI", and links to review each submission.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission } from '@/lib/auth-helpers';
import { gradingQueue, gradingStats, aiStatus } from '@/lib/grading';
import { PageHeader } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import QueueTable from './QueueTable';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Grading' };

export default async function GradingPage({ searchParams }: { searchParams: Promise<{ assignment?: string; show?: string }> }) {
  const user = await requirePermission('grading.review');
  const sp = await searchParams;
  const show = sp.show === 'graded' ? 'graded' : sp.show === 'all' ? 'all' : 'todo';
  const [{ rows, assignments }, stats, ai] = await Promise.all([
    gradingQueue(user, { assignmentId: sp.assignment || undefined, show }),
    gradingStats(user),
    aiStatus(user.orgId),
  ]);
  const current = assignments.find((a) => a.id === sp.assignment);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(sp.assignment ? { assignment: sp.assignment } : {}), show, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/grading?${p.toString()}`;
  };

  const tiles = [
    { label: 'Waiting for a grade', value: stats.toGrade, icon: 'assignments' as const },
    { label: 'AI suggestions to review', value: stats.aiReady, icon: 'sparkle' as const },
    { label: 'AI-assisted (30 days)', value: stats.aiApproved30, icon: 'grading' as const },
    { label: 'Edited by mentors', value: stats.aiEditedPct === null ? '—' : `${stats.aiEditedPct}%`, icon: 'progress' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching"
        title="Grading"
        subtitle="Grade submissions by hand or with AI suggestions. Learners only ever see the grade you approve."
        actions={
          current ? (
            <>
              <Link href={`/grading/report/${current.id}`} className="btn-outline h-10 px-4 text-sm">
                <NavIcon name="reports" size={16} /> Report
              </Link>
              <Link href={`/grading/setup/${current.id}`} className="btn-outline h-10 px-4 text-sm">
                Rubric &amp; AI setup
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              <NavIcon name={t.icon} size={13} /> {t.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] border text-sm ${
          ai.available ? 'border-border bg-hero/40' : 'border-border bg-bg'
        }`}
      >
        <NavIcon name="sparkle" size={16} className="shrink-0" />
        <p className="flex-1">
          {ai.available ? (
            <>
              AI suggestions are on · {ai.used}/{ai.limit} used this month{ai.model ? ` · ${ai.model}` : ''}. Reads PDFs, Word, PowerPoint, Excel and code files{ai.vision ? ', plus images and scanned pages' : ''}. Every suggestion needs your review.
            </>
          ) : (
            <>
              <b>AI suggestions are unavailable:</b> {ai.reason} You can still grade everything by hand.
            </>
          )}
        </p>
        {user.role === 'admin' && !ai.available && (
          <Link href="/admin/settings?section=ai" className="btn-outline h-8 px-3 text-xs shrink-0">
            AI settings
          </Link>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        {!current && assignments.length > 0 && (
          <p className="text-xs text-muted lg:order-last lg:ml-auto">Pick an assignment to see its report and rubric.</p>
        )}
        <form action="/grading" className="flex gap-2">
          <input type="hidden" name="show" value={show} />
          <select name="assignment" defaultValue={sp.assignment ?? ''} className="input h-10 text-sm lg:w-80" aria-label="Assignment">
            <option value="">All assignments</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} — {a.programName}
              </option>
            ))}
          </select>
          <button className="btn-outline h-10 px-3 text-sm">Show</button>
        </form>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Which submissions">
          {(
            [
              ['todo', 'To grade'],
              ['graded', 'Graded'],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={qs({ show: id })}
              role="tab"
              aria-selected={show === id}
              className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${
                show === id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <QueueTable rows={rows} aiAvailable={ai.available} assignmentId={sp.assignment || undefined} show={show} />
    </div>
  );
}
