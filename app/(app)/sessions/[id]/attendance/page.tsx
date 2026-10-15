// =============================================================================
// FILE: app/(app)/attendance/page.tsx
// Student attendance: overall ring, per-program breakdown, session history.
// Mentors/admins are redirected to /sessions. Data logic unchanged.
// =============================================================================

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import {
  getStudentAttendanceSummary,
  getStudentSessionHistory,
} from '@/lib/attendance';
import type { AttendanceStatus } from '@/lib/constants';
import {
  PageHeader,
  Badge,
  EmptyNote,
  DateTile,
  ProgressRing,
  Icons,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <Badge tone="muted">not marked</Badge>;
  if (status === 'present') return <Badge tone="success" dot>present</Badge>;
  if (status === 'absent') return <Badge tone="danger" dot>absent</Badge>;
  if (status === 'late') return <Badge tone="warning" dot>late</Badge>;
  return <Badge tone="muted" dot>excused</Badge>;
}

export default async function AttendancePage() {
  const user = await requireAuth();

  if (user.role !== 'student') {
    // Mentors mark attendance per session — point them there.
    redirect('/sessions');
  }

  const [summary, history] = await Promise.all([
    getStudentAttendanceSummary(user.orgId, user.id),
    getStudentSessionHistory(user.orgId, user.id, 100),
  ]);

  const overall = summary.reduce(
    (acc, s) => {
      acc.present += s.present;
      acc.absent += s.absent;
      acc.late += s.late;
      acc.excused += s.excused;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0 }
  );
  const overallDenom = overall.present + overall.absent + overall.late;
  const overallRate =
    overallDenom > 0 ? (overall.present + overall.late) / overallDenom : 0;
  const totalRecords =
    overall.present + overall.absent + overall.late + overall.excused;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Progress"
        title="Your attendance"
        subtitle={`Overall rate: ${Math.round(overallRate * 100)}% · ${totalRecords} records`}
      />

      {/* Overall */}
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-hero p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 w-48 h-48 rounded-full bg-accent opacity-70" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <ProgressRing value={overallRate} size={112} stroke={10} />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Present" value={overall.present} tone="success" />
            <Stat label="Absent" value={overall.absent} tone="danger" />
            <Stat label="Late" value={overall.late} tone="warning" />
            <Stat label="Excused" value={overall.excused} tone="muted" />
          </div>
        </div>
      </section>

      {/* Per-program summary */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">By program</h2>
        {summary.length === 0 ? (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
            <EmptyNote
              icon={Icons.check}
              title="No attendance records yet."
              text="Your mentor will mark attendance after each session."
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {summary.map((s) => {
              const pct = Math.round(s.attendanceRate * 100);
              return (
                <div
                  key={s.programId}
                  className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{s.programName}</h3>
                      <p className="text-xs text-muted mt-0.5">
                        {s.total} sessions marked
                      </p>
                    </div>
                    <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-hero overflow-hidden">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <MiniStat label="Present" value={s.present} tone="success" />
                    <MiniStat label="Absent" value={s.absent} tone="danger" />
                    <MiniStat label="Late" value={s.late} tone="warning" />
                    <MiniStat label="Excused" value={s.excused} tone="muted" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Session history */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Session history
        </h2>

        {history.length === 0 ? (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
            <EmptyNote compact icon={Icons.clock} title="Nothing here yet." />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden divide-y divide-border">
            {history.map((h) => (
              <Link
                key={h.sessionId}
                href={`/sessions/${h.sessionId}`}
                className="flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-hero/40 transition"
              >
                <DateTile iso={h.sessionStartsAt} muted />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{h.sessionTitle}</p>
                  <p className="text-xs text-muted truncate">
                    {h.programName} · {fmt(h.sessionStartsAt)}
                  </p>
                  {h.note && (
                    <p className="text-xs text-muted mt-0.5 italic truncate">{h.note}</p>
                  )}
                </div>
                <StatusChip status={h.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const TONE_TEXT = {
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  muted: 'text-muted',
} as const;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_TEXT;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface/85 border border-border px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_TEXT;
}) {
  return (
    <div className="text-center rounded-[var(--radius-md)] bg-bg py-2">
      <p className={`text-lg font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}