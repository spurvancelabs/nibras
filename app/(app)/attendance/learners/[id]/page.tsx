// =============================================================================
// FILE: app/(app)/attendance/learners/[id]/page.tsx   (NEW FILE)
// One learner's attendance history (mentors: only learners in their
// programs; admins: everyone).
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth-helpers';
import { learnerHistory, rateOf, absenceStreak } from '@/lib/attendance-reports';
import { PageHeader, Panel, Badge, DateTile, ProgressRing } from '@/components/ui';
import { formatDateTimeWeekday } from '@/lib/time';
import type { AttendanceStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'muted'> = { present: 'success', absent: 'danger', late: 'warning', excused: 'muted' };

export default async function LearnerAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('attendance.reports');
  const { id } = await params;
  const h = await learnerHistory(user, id);
  if (!h) notFound();

  const c = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of h.rows) if (r.status) c[r.status]++;
  const rate = rateOf(c);
  const streak = absenceStreak(h.rows.map((r) => r.status));

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: '/attendance', label: 'Attendance' }} title={h.name} subtitle={h.email} />
      <section className="flex flex-col sm:flex-row sm:items-center gap-6 p-5 rounded-[var(--radius-lg)] bg-hero">
        <ProgressRing value={rate ?? 0} size={104} stroke={10} />
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1 text-center">
          {(
            [
              ['Present', c.present, 'text-success'],
              ['Late', c.late, 'text-warning'],
              ['Absent', c.absent, 'text-danger'],
              ['Excused', c.excused, 'text-muted'],
              ['In a row', streak, streak >= 3 ? 'text-danger' : ''],
            ] as [string, number, string][]
          ).map(([label, v, tone]) => (
            <div key={label} className="rounded-[var(--radius-md)] bg-surface/85 border border-border py-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
              <dd className={`text-xl font-semibold tabular-nums ${tone}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Panel title="Sessions" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {h.rows.map((r) => (
            <li key={r.sessionId}>
              <Link href={`/sessions/${r.sessionId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hero/40 transition">
                <DateTile iso={r.startsAt} muted />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{r.title}</span>
                  <span className="block text-xs text-muted truncate">
                    {r.programName} · {formatDateTimeWeekday(r.startsAt)}
                  </span>
                  {r.note && <span className="block text-xs text-muted italic truncate">{r.note}</span>}
                </span>
                {r.status ? <Badge tone={TONE[r.status]} dot>{r.status}</Badge> : <Badge tone="muted">not marked</Badge>}
              </Link>
            </li>
          ))}
          {h.rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No past sessions yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
