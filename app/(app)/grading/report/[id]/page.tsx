// =============================================================================
// FILE: app/(app)/grading/report/[id]/page.tsx   (NEW FILE)
// Grading report for one assignment (its mentors and admins):
//   submission / grading progress, score summary and grade bands, rubric
//   averages, how close AI suggestions were to the final grades, AI flags,
//   who hasn't submitted, and every learner's result (CSV export).
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth-helpers';
import { assignmentReport } from '@/lib/grading';
import { PageHeader, Panel } from '@/components/ui';
import { BarList } from '@/components/charts';
import { formatDateTime } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Grading report' };

const FLAG_LABEL: Record<string, string> = {
  injection_suspected: 'Tried to instruct the AI',
  truncated: 'Too long — partly read',
  attachment_unread: 'Attachment not readable',
  images_reviewed: 'Images / scans reviewed',
  low_confidence: 'Low AI confidence',
  empty: 'Little or no content',
  incomplete: 'Rubric not fully scored',
};

function Stat({ label, value, hint, tone = '' }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export default async function GradingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('grading.review');
  const { id } = await params;
  const r = await assignmentReport(user, id);
  if (!r) notFound();
  const { summary: s, counts: c, agreement: ag } = r;
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
  const missing = r.rows.filter((x) => !x.submittedAt);
  const graded = r.rows.filter((x) => x.percent !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/grading?assignment=${r.assignment.id}`, label: 'Grading queue' }}
        eyebrow={`Report · ${r.assignment.programName}`}
        title={r.assignment.title}
        subtitle={`Out of ${r.assignment.maxMarks} · due ${formatDateTime(r.assignment.dueAt)}`}
        actions={
          <>
            <Link href={`/grading/setup/${r.assignment.id}`} className="btn-outline h-10 px-4 text-sm">
              Rubric &amp; AI setup
            </Link>
            <a href={`/grading/report/${r.assignment.id}/export`} className="btn-primary h-10 px-4 text-sm">
              Download CSV
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Submitted" value={`${c.submitted}/${c.students}`} hint={c.students ? `${Math.round((c.submitted / c.students) * 100)}% of learners` : undefined} />
        <Stat label="Graded" value={c.graded} hint={c.pending ? `${c.pending} waiting` : 'all done'} tone={c.pending ? 'text-warning' : 'text-success'} />
        <Stat label="Average" value={pct(s.average)} hint={s.median !== null ? `median ${s.median}%` : undefined} />
        <Stat label="Pass rate" value={pct(s.passRate)} hint="50% or more" />
        <Stat label="Late" value={c.late} />
        <Stat label="Missing" value={c.missing} tone={c.missing ? 'text-danger' : ''} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Grade bands">
          {graded.length ? (
            <>
              <BarList rows={r.bands} />
              <p className="mt-4 text-xs text-muted">
                Highest {pct(s.highest)} · lowest {pct(s.lowest)} · spread (std. dev.) {s.stdev ?? '—'} points
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No grades yet.</p>
          )}
        </Panel>

        <Panel title="AI vs final grades">
          {ag.pairs ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{ag.within10}%</p>
                  <p className="text-xs text-muted">within 10% of the final grade</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{ag.meanAbsDiff}</p>
                  <p className="text-xs text-muted">average gap (% points)</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{ag.edited}%</p>
                  <p className="text-xs text-muted">edited by a mentor</p>
                </div>
              </div>
              <p className="text-xs text-muted">
                Based on {ag.pairs} approved AI suggestion{ag.pairs === 1 ? '' : 's'}. AI was higher {ag.aiHigher}× and lower {ag.aiLower}×.
                {ag.within10 !== null && ag.within10 < 70 ? ' Consider improving the rubric or reference answer.' : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">No AI-assisted grades yet for this assignment.</p>
          )}
        </Panel>

        {r.criteria.some((x) => x.samples) && (
          <Panel title="Rubric averages (AI-assisted grades)">
            <BarList rows={r.criteria.map((x) => ({ label: `${x.title} (/${x.maxPoints})`, value: x.average ?? 0, hint: `${x.samples} graded` }))} max={Math.max(...r.criteria.map((x) => x.maxPoints))} />
            <p className="mt-3 text-xs text-muted">The weakest criterion is where the class needs the most help.</p>
          </Panel>
        )}

        {r.flags.length > 0 && (
          <Panel title="Things the AI flagged">
            <BarList rows={r.flags.map((f) => ({ label: FLAG_LABEL[f.flag] ?? f.flag, value: f.count }))} tone="warning" />
          </Panel>
        )}

        {missing.length > 0 && (
          <Panel title={`Not submitted (${missing.length})`}>
            <ul className="text-sm grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {missing.slice(0, 100).map((m) => (
                <li key={m.studentId} className="truncate">
                  {m.name}
                </li>
              ))}
            </ul>
            {missing.length > 100 && <p className="mt-2 text-xs text-muted">…and {missing.length - 100} more (see CSV).</p>}
          </Panel>
        )}
      </div>

      <Panel title="Every learner" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Learner</th>
                <th className="px-4 py-2.5 font-medium">Submitted</th>
                <th className="px-4 py-2.5 font-medium text-right">Marks</th>
                <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">AI suggested</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Notes</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.rows.map((x) => (
                <tr key={x.studentId}>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{x.name}</span>
                    <span className="block text-xs text-muted">{x.email}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{x.submittedAt ? <>{formatDateTime(x.submittedAt)}{x.late && <span className="ml-1.5 text-xs text-warning">late</span>}</> : <span className="text-danger text-xs">missing</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{x.marks === null ? (x.submittedAt ? <span className="text-xs text-muted">to grade</span> : '—') : `${x.marks}/${r.assignment.maxMarks}`}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">{x.aiMarks === null ? '—' : x.aiMarks}</td>
                  <td className="px-4 py-2.5 text-xs text-muted hidden lg:table-cell">{[x.aiAssisted ? (x.edited ? 'AI-assisted (edited)' : 'AI-assisted') : '', ...x.flags.map((f) => FLAG_LABEL[f] ?? f)].filter(Boolean).join(' · ')}</td>
                  <td className="px-4 py-2.5 text-right">
                    {x.submissionId && (
                      <Link href={`/grading/review/${x.submissionId}`} className="btn-ghost h-8 px-2.5 text-xs">
                        {x.marks === null ? 'Grade' : 'Open'}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
