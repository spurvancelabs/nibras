'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { saveAttendanceAction } from './attendance/actions';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/lib/constants';
import type { AttendanceRosterRow } from '@/lib/attendance';

type Props = {
  sessionId: string;
  roster: AttendanceRosterRow[];
  canManage: boolean;
  myAttendance: { status: AttendanceStatus; note: string } | null;
  viewerIsStudent: boolean;
};

const LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

const COLOR: Record<AttendanceStatus, string> = {
  present: 'bg-[var(--color-success)] text-white border-transparent',
  absent: 'bg-[var(--color-danger)] text-white border-transparent',
  late: 'bg-[var(--color-warning)] text-white border-transparent',
  excused: 'bg-slate-500 text-white border-transparent',
};

// Student-facing status chip
function StatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="badge-muted">not marked</span>;
  if (status === 'present') return <span className="badge-success">present</span>;
  if (status === 'absent') return <span className="badge-danger">absent</span>;
  if (status === 'late') return <span className="badge-warning">late</span>;
  return <span className="badge-muted">excused</span>;
}

export default function AttendancePanel({
  sessionId,
  roster,
  canManage,
  myAttendance,
  viewerIsStudent,
}: Props) {
  const router = useRouter();

  // Student view — just show their own status
  if (viewerIsStudent) {
    return (
      <div className="card space-y-2">
        <h2 className="font-semibold">Your attendance</h2>
        {myAttendance ? (
          <>
            <div className="flex items-center gap-2">
              <StatusChip status={myAttendance.status} />
            </div>
            {myAttendance.note && (
              <p className="text-xs text-muted">{myAttendance.note}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            Your mentor hasn't marked attendance for this session yet.
          </p>
        )}
      </div>
    );
  }

  // Mentor/admin: editable grid
  const [state, setState] = useState<Record<string, { status: AttendanceStatus | null; note: string }>>(
    () => {
      const map: Record<string, { status: AttendanceStatus | null; note: string }> = {};
      for (const r of roster) {
        map[r.studentId] = { status: r.status, note: r.note };
      }
      return map;
    }
  );

  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function setStatus(studentId: string, status: AttendanceStatus) {
    setState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  function setNote(studentId: string, note: string) {
    setState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note },
    }));
  }

  function markAllPresent() {
    const next: typeof state = {};
    for (const r of roster) {
      next[r.studentId] = {
        status: 'present',
        note: state[r.studentId]?.note ?? '',
      };
    }
    setState(next);
  }

  function clearAll() {
    const next: typeof state = {};
    for (const r of roster) {
      next[r.studentId] = { status: null, note: '' };
    }
    setState(next);
  }

  function save() {
    setError('');
    setMsg('');

    const entries = Object.entries(state)
      .filter(([, v]) => v.status !== null)
      .map(([studentId, v]) => ({
        studentId,
        status: v.status as AttendanceStatus,
        note: v.note,
      }));

    if (entries.length === 0) {
      setError('Mark at least one student before saving.');
      return;
    }

    start(async () => {
      const res = await saveAttendanceAction({ sessionId, entries });
      if (res.ok) {
        setMsg(`Saved ${res.count ?? 0} record${res.count === 1 ? '' : 's'}.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!canManage) {
    return (
      <div className="card text-sm text-muted">
        Attendance is managed by the mentor of this session.
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="card text-sm text-muted">
        No students in this program yet.
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Attendance</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAllPresent}
            className="btn-outline text-xs"
          >
            Mark all present
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="btn-outline text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {msg && (
        <div className="text-sm px-3 py-2 rounded-md border bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800">
          {msg}
        </div>
      )}

      <ul className="divide-y divide-border">
        {roster.map((r) => {
          const cur = state[r.studentId] ?? { status: null, note: '' };
          return (
            <li key={r.studentId} className="py-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={r.name} src={r.avatar} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted truncate">{r.email}</p>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {ATTENDANCE_STATUSES.map((s) => {
                    const active = cur.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(r.studentId, s)}
                        className={`px-2 py-1 text-xs rounded-md border transition ${
                          active
                            ? COLOR[s]
                            : 'bg-surface text-muted border-border hover:bg-bg'
                        }`}
                      >
                        {LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                className="input text-xs"
                placeholder="Optional note (e.g. left early)"
                value={cur.note}
                onChange={(e) => setNote(r.studentId, e.target.value)}
                maxLength={300}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? 'Saving…' : 'Save attendance'}
        </button>
      </div>
    </div>
  );
}