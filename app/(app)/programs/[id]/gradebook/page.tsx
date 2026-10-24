// =============================================================================
// FILE: app/(app)/programs/[id]/gradebook/page.tsx   (NEW FILE)
// Every student × every assignment and quiz, with attendance and averages.
// Staff of the program only. CSV export.
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { hubAccess } from '@/lib/program-hub';
import { computeProgramProgress } from '@/lib/progress';
import { getSettings } from '@/lib/settings';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import { PageHeader, EmptyNote } from '@/components/ui';

export const dynamic = 'force-dynamic';

const tone = (v: number | null) =>
  v === null ? 'text-muted' : v >= 75 ? 'text-success' : v >= 50 ? 'text-warning' : 'text-danger';

export default async function GradebookPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  if ((await hubAccess(user.orgId, user, id)) !== 'manage') notFound();
  if ((await getSettings()).featureGradebook === false) {
    return <EmptyNote title="The gradebook is turned off." text="An admin can turn it on in Settings → Features." />;
  }
  await db();
  const program = (await Program.findById(id).select('name').lean()) as { name: string } | null;
  const data = await computeProgramProgress(user.orgId, id);
  if (!data || !program) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/programs/${id}`, label: program.name }}
        eyebrow="Gradebook"
        title={program.name}
        subtitle={`${data.students.length} students · ${data.columns.length} graded items · * = quiz answers still being marked`}
        actions={<a href={`/programs/${id}/gradebook/export`} className="btn-outline h-10 inline-flex items-center">Export CSV</a>}
      />
      {data.students.length === 0 ? (
        <EmptyNote title="No students in this program." />
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
          <div className="overflow-auto max-h-[75vh]">
            <table className="text-sm border-separate border-spacing-0 min-w-full">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="sticky left-0 top-0 z-20 bg-bg px-4 py-3 border-b border-r border-border min-w-[200px]">Student</th>
                  {['Attendance', 'Assignments', 'Quizzes'].map((h) => (
                    <th key={h} className="sticky top-0 z-10 bg-bg px-3 py-3 border-b border-border font-semibold text-text whitespace-nowrap">{h}</th>
                  ))}
                  {data.columns.map((c) => (
                    <th key={c.id} className="sticky top-0 z-10 bg-bg px-3 py-3 border-b border-border font-medium min-w-[110px]">
                      <Link href={c.kind === 'quiz' ? `/quizzes/${c.id}` : `/assignments/${c.id}`} className="hover:underline line-clamp-2" title={c.title}>
                        <span className="block text-[10px] uppercase tracking-wider">{c.kind === 'quiz' ? 'Quiz' : `Assignment · /${c.max}`}</span>
                        {c.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-hero/30">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 border-b border-r border-border">
                      <p className="font-medium truncate max-w-[220px]">{s.name}</p>
                      <p className="text-[11px] text-muted truncate max-w-[220px]">{s.memberId || s.email}</p>
                    </td>
                    {[s.attendance.percent, s.assignments.percent, s.quizzes.percent].map((v, k) => (
                      <td key={k} className={`px-3 py-2.5 border-b border-border font-semibold tabular-nums ${tone(v)}`}>{v === null ? '—' : `${v}%`}</td>
                    ))}
                    {data.columns.map((c) => {
                      const cell = s.cells[c.id];
                      const cls =
                        cell?.state === 'missing'
                          ? 'text-danger'
                          : cell?.state === 'submitted'
                          ? 'text-warning'
                          : cell?.state === 'late'
                          ? 'text-warning'
                          : cell?.state === 'pending'
                          ? 'text-muted'
                          : '';
                      return (
                        <td key={c.id} className={`px-3 py-2.5 border-b border-border tabular-nums whitespace-nowrap ${cls}`} title={cell?.state === 'late' ? 'Submitted late' : undefined}>
                          {cell?.label ?? '—'}
                          {cell?.state === 'late' && ' ⏱'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
