// =============================================================================
// FILE: app/(app)/sessions/[id]/AttendancePanel.tsx
// Session attendance (client).
//  - Student: sees own status.
//  - Mentor/admin: roster with Present/Absent/Late/Excused, notes, live counts,
//    sticky save bar.
// Logic unchanged. The mentor view is now its own component so React hooks are
// never called after an early return (rules-of-hooks fix).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { saveAttendanceAction } from './attendance/actions';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/lib/constants';
import type { AttendanceRosterRow } from '@/lib/attendance';
import { Panel, Badge, Alert, EmptyNote, Icons } from '@/components/ui';

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

const ACTIVE: Record<AttendanceStatus, string> = {
  present: 'bg-success text-white border-success',
  absent: 'bg-danger text-white border-danger',
  late: 'bg-warning text-white border-warning',
  excused: 'bg-muted text-white border-muted',
};

const TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'muted'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'muted',
};

// Student-facing status chip
function StatusChip({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <Badge tone="muted">not marked</Badge>;
  return <Badge tone={TONE[status]} dot>{status}</Badge>;
}

export default function AttendancePanel(props: Props) {
  // Student view — just show their own status
  if (props.viewerIsStudent) {
    const { myAttendance } = props;
    return (
      <Panel title="Your attendance" icon={Icons.check}>
        {myAttendance ? (
          <div className="flex items-start gap-3">
            <StatusChip status={myAttendance.status} />
            {myAttendance.note && (
              <p className="text-sm text-muted">{myAttendance.note}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Your mentor hasn&apos;t marked attendance for this session yet.
          </p>
        )}
      </Panel>
    );
  }

  if (!props.canManage) {
    return (
      <Panel title="Attendance" icon={Icons.check}>
        <p className="text-sm text-muted">
          Attendance is managed by the mentor of this session.
        </p>
      </Panel>
    );
  }

  if (props.roster.length === 0) {
    return (
      <Panel title="Attendance" icon={Icons.check} bodyClassName="p-0">
        <EmptyNote compact icon={Icons.users} title="No students in this program yet." />
      </Panel>
    );
  }

  return <AttendanceEditor sessionId={props.sessionId} roster={props.roster} />;
}

// ---------------------------------------------------------------------------
// Mentor/admin: editable roster
// ---------------------------------------------------------------------------

function AttendanceEditor({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: AttendanceRosterRow[];
}) {
  const router = useRouter();

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

  // Live counts (display only)
  const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  for (const r of roster) {
    const s = state[r.studentId]?.status ?? null;
    if (s) counts[s] += 1;
    else counts.unmarked += 1;
  }

  return (
    <Panel
      title="Attendance"
      icon={Icons.check}
      bodyClassName="p-0"
      action={
        <div className="flex gap-2">
          <button type="button" onClick={markAllPresent} className="btn-outline text-xs h-8">
            Mark all present
          </button>
          <button type="button" onClick={clearAll} className="btn-ghost text-xs h-8">
            Clear
          </button>
        </div>
      }
    >
      {/* Summary */}
      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border bg-bg">
        <Badge tone="success">{counts.present} present</Badge>
        <Badge tone="danger">{counts.absent} absent</Badge>
        <Badge tone="warning">{counts.late} late</Badge>
        <Badge tone="muted">{counts.excused} excused</Badge>
        {counts.unmarked > 0 && (
          <span className="text-[11px] text-muted self-center">{counts.unmarked} not marked</span>
        )}
      </div>

      {(error || msg) && (
        <div className="px-5 pt-4">
          {error && <Alert>{error}</Alert>}
          {msg && <Alert tone="success">{msg}</Alert>}
        </div>
      )}

      <ul className="divide-y divide-border">
        {roster.map((r) => {
          const cur = state[r.studentId] ?? { status: null, note: '' };
          return (
            <li key={r.studentId} className="px-5 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar name={r.name} src={r.avatar} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted truncate">{r.email}</p>
                  </div>
                </div>

                <div
                  role="radiogroup"
                  aria-label={`Attendance for ${r.name}`}
                  className="grid grid-cols-4 sm:flex gap-1 p-1 rounded-[var(--radius-md)] bg-bg border border-border"
                >
                  {ATTENDANCE_STATUSES.map((s) => {
                    const active = cur.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setStatus(r.studentId, s)}
                        className={`h-8 px-2.5 text-xs font-medium rounded-[calc(var(--radius-md)-2px)] border transition ${
                          active
                            ? ACTIVE[s]
                            : 'border-transparent text-muted hover:text-text hover:bg-surface'
                        }`}
                      >
                        {LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                className="input text-xs h-9"
                placeholder="Optional note (e.g. left early)"
                value={cur.note}
                onChange={(e) => setNote(r.studentId, e.target.value)}
                maxLength={300}
                aria-label={`Note for ${r.name}`}
              />
            </li>
          );
        })}
      </ul>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-surface/95 backdrop-blur">
        <p className="text-xs text-muted">
          {roster.length - counts.unmarked} of {roster.length} marked
        </p>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary h-10 px-5"
        >
          {pending ? 'Saving…' : 'Save attendance'}
        </button>
      </div>
    </Panel>
  );
}