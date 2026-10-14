import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import {
  getStudentAttendanceSummary,
  getStudentSessionHistory,
} from '@/lib/attendance';
import type { AttendanceStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="badge-muted">not marked</span>;
  if (status === 'present') return <span className="badge-success">present</span>;
  if (status === 'absent') return <span className="badge-danger">absent</span>;
  if (status === 'late') return <span className="badge-warning">late</span>;
  return <span className="badge-muted">excused</span>;
}

export default async function AttendancePage() {
  const user = await requireAuth();

  if (user.role !== 'student') {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your attendance</h1>
        <p className="text-sm text-muted">
          Overall rate: {Math.round(overallRate * 100)}% ·{' '}
          {overall.present + overall.absent + overall.late + overall.excused}{' '}
          records
        </p>
      </div>

      {summary.length === 0 ? (
        <div className="card text-sm text-muted">
          No attendance records yet. Your mentor will mark attendance after each session.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {summary.map((s) => (
            <div key={s.programId} className="card space-y-3">
              <div>
                <h3 className="font-medium">{s.programName}</h3>
                <p className="text-xs text-muted">
                  {Math.round(s.attendanceRate * 100)}% attendance · {s.total}{' '}
                  sessions marked
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Present" value={s.present} tone="success" />
                <Stat label="Absent" value={s.absent} tone="danger" />
                <Stat label="Late" value={s.late} tone="warning" />
                <Stat label="Excused" value={s.excused} tone="muted" />
              </div>

              <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-[var(--color-success)]"
                  style={{ width: `${Math.round(s.attendanceRate * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
          Session history
        </h2>

        {history.length === 0 ? (
          <div className="card text-sm text-muted">Nothing here yet.</div>
        ) : (
          <div className="card p-0 overflow-hidden divide-y divide-border">
            {history.map((h) => (
              <Link
                key={h.sessionId}
                href={`/sessions/${h.sessionId}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-bg transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {h.sessionTitle}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {h.programName} · {fmt(h.sessionStartsAt)}
                  </p>
                  {h.note && (
                    <p className="text-xs text-muted mt-0.5 italic">{h.note}</p>
                  )}
                </div>
                <StatusChip status={h.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'muted';
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'danger'
      ? 'text-[var(--color-danger)]'
      : tone === 'warning'
      ? 'text-[var(--color-warning)]'
      : 'text-muted';
  return (
    <div>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}