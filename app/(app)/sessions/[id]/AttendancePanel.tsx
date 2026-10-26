// =============================================================================
// FILE: app/(app)/sessions/[id]/AttendancePanel.tsx
// Session attendance (client).
//  - Student: sees own status.
//  - Mentor/admin: roster with Present/Absent/Late/Excused, notes, live counts,
//    sticky save bar. UPDATED: search, bulk marking, keyboard shortcuts,
//    unsaved-change tracking and edit-conflict detection.
// Logic unchanged. The mentor view is now its own component so React hooks are
// never called after an early return (rules-of-hooks fix).
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { saveAttendanceAction } from './attendance/actions';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/lib/constants';
import type { AttendanceRosterRow } from '@/lib/attendance';
import { Panel, Badge, Alert, EmptyNote, Icons } from '@/components/ui';
import { useConfirm, useToast } from '@/components/feedback';

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
//   - search, select rows + bulk set, "mark the rest absent"
//   - keyboard: P / A / L / E on a focused row, ↑ ↓ (or J / K) to move
//   - unsaved changes are counted and protected (leave-page warning)
//   - only changed rows are sent; if someone else saved meanwhile you can
//     reload or overwrite (conflict detection)
// ---------------------------------------------------------------------------

type RowState = { status: AttendanceStatus | null; note: string };

const KEYS: Record<string, AttendanceStatus> = { p: 'present', a: 'absent', l: 'late', e: 'excused' };

function AttendanceEditor({ sessionId, roster }: { sessionId: string; roster: AttendanceRosterRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const initial = useMemo(() => {
    const map: Record<string, RowState> = {};
    for (const r of roster) map[r.studentId] = { status: r.status, note: r.note };
    return map;
  }, [roster]);
  const base = useMemo(() => Object.fromEntries(roster.map((r) => [r.studentId, r.markedAt])), [roster]);

  const [state, setState] = useState<Record<string, RowState>>(initial);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Reset when the server sends a fresh roster (after save / refresh)
  useEffect(() => {
    setState(initial);
    setSelected(new Set());
  }, [initial]);

  const dirtyIds = roster
    .map((r) => r.studentId)
    .filter((id) => state[id]?.status !== initial[id]?.status || (state[id]?.note ?? '') !== (initial[id]?.note ?? ''));
  const dirty = dirtyIds.filter((id) => state[id]?.status);

  useEffect(() => {
    if (!dirty.length) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty.length]);

  const term = q.trim().toLowerCase();
  const visible = term ? roster.filter((r) => `${r.name} ${r.email} ${r.memberId ?? ''}`.toLowerCase().includes(term)) : roster;

  function setStatus(ids: string[], status: AttendanceStatus | null) {
    setState((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { ...next[id], status };
      return next;
    });
  }
  function setNote(id: string, note: string) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }
  function toggleSel(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function onRowKey(e: React.KeyboardEvent, idx: number, id: string) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (KEYS[k]) {
      e.preventDefault();
      setStatus([id], KEYS[k]);
      const nextRow = visible[idx + 1];
      if (nextRow) rowRefs.current[nextRow.studentId]?.focus();
    } else if (k === 'arrowdown' || k === 'j') {
      e.preventDefault();
      const n = visible[idx + 1];
      if (n) rowRefs.current[n.studentId]?.focus();
    } else if (k === 'arrowup' || k === 'k') {
      e.preventDefault();
      const n = visible[idx - 1];
      if (n) rowRefs.current[n.studentId]?.focus();
    } else if (k === ' ' || k === 'x') {
      e.preventDefault();
      toggleSel(id);
    }
  }

  function save(force = false) {
    setError('');
    const entries = dirty.map((id) => ({ studentId: id, status: state[id].status as AttendanceStatus, note: state[id].note }));
    if (entries.length === 0) {
      setError('Nothing to save — mark at least one learner.');
      return;
    }
    start(async () => {
      const res = await saveAttendanceAction({ sessionId, entries, base, force });
      if (res.ok) {
        toast.success(`Saved ${res.count ?? 0} change${res.count === 1 ? '' : 's'}.`);
        router.refresh();
      } else if (res.conflicts?.length) {
        const names = res.conflicts
          .map((c) => roster.find((r) => r.studentId === c.studentId)?.name ?? 'someone')
          .slice(0, 5)
          .join(', ');
        const overwrite = await confirm({
          title: 'Attendance changed while you were editing',
          body: `${res.conflicts.length} record${res.conflicts.length === 1 ? ' was' : 's were'} saved by someone else (${names}${res.conflicts.length > 5 ? '…' : ''}). Overwrite with your version, or cancel to reload the latest?`,
          confirmLabel: 'Overwrite',
          cancelLabel: 'Reload latest',
          tone: 'danger',
        });
        if (overwrite) save(true);
        else router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  for (const r of roster) {
    const st = state[r.studentId]?.status ?? null;
    if (st) counts[st] += 1;
    else counts.unmarked += 1;
  }
  const selIds = [...selected];
  const unmarkedIds = roster.filter((r) => !state[r.studentId]?.status).map((r) => r.studentId);

  return (
    <Panel
      title="Attendance"
      icon={Icons.check}
      bodyClassName="p-0"
      action={
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={() => setStatus(roster.map((r) => r.studentId), 'present')} className="btn-outline text-xs h-8">
            All present
          </button>
          {unmarkedIds.length > 0 && unmarkedIds.length < roster.length && (
            <button type="button" onClick={() => setStatus(unmarkedIds, 'absent')} className="btn-outline text-xs h-8">
              Rest absent
            </button>
          )}
          <button type="button" onClick={() => setState(initial)} className="btn-ghost text-xs h-8" disabled={!dirtyIds.length}>
            Undo changes
          </button>
        </div>
      }
    >
      {/* Summary + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3 border-b border-border bg-bg">
        <div className="flex flex-wrap gap-2 flex-1">
          <Badge tone="success">{counts.present} present</Badge>
          <Badge tone="danger">{counts.absent} absent</Badge>
          <Badge tone="warning">{counts.late} late</Badge>
          <Badge tone="muted">{counts.excused} excused</Badge>
          {counts.unmarked > 0 && <span className="text-[11px] text-muted self-center">{counts.unmarked} not marked</span>}
        </div>
        {roster.length > 8 && (
          <input
            type="search"
            className="input h-9 text-sm sm:w-56"
            placeholder="Find a learner…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Find a learner"
          />
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-border bg-primary/5" role="region" aria-label="Bulk marking">
          <span className="text-sm font-medium">{selected.size} selected</span>
          {ATTENDANCE_STATUSES.map((st) => (
            <button key={st} type="button" className="btn-outline h-8 px-3 text-xs" onClick={() => setStatus(selIds, st)}>
              {LABEL[st]}
            </button>
          ))}
          <button type="button" className="text-xs text-muted underline ml-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {error && (
        <div className="px-5 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <p className="hidden md:block px-5 pt-3 text-[11px] text-muted">
        Tip: click a row, then press <kbd className="kbd">P</kbd> <kbd className="kbd">A</kbd> <kbd className="kbd">L</kbd> <kbd className="kbd">E</kbd> to mark and move down; <kbd className="kbd">↑</kbd>{' '}
        <kbd className="kbd">↓</kbd> to move, <kbd className="kbd">Space</kbd> to select.
      </p>

      <ul className="divide-y divide-border">
        {visible.map((r, idx) => {
          const cur = state[r.studentId] ?? { status: null, note: '' };
          const changed = dirtyIds.includes(r.studentId);
          return (
            <li
              key={r.studentId}
              ref={(el) => {
                rowRefs.current[r.studentId] = el;
              }}
              tabIndex={0}
              onKeyDown={(e) => onRowKey(e, idx, r.studentId)}
              className={`px-5 py-3.5 space-y-2.5 outline-none focus-visible:bg-hero/60 ${selected.has(r.studentId) ? 'bg-primary/5' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selected.has(r.studentId)}
                    onChange={() => toggleSel(r.studentId)}
                    aria-label={`Select ${r.name}`}
                    className="accent-[var(--color-primary)]"
                    tabIndex={-1}
                  />
                  <Avatar name={r.name} src={r.avatar} size={34} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.name}
                      {changed && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-warning align-middle" title="Unsaved change" />}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {r.memberId ? `${r.memberId} · ` : ''}
                      {r.email}
                    </p>
                  </div>
                </div>

                <div role="radiogroup" aria-label={`Attendance for ${r.name}`} className="grid grid-cols-4 sm:flex gap-1 p-1 rounded-[var(--radius-md)] bg-bg border border-border">
                  {ATTENDANCE_STATUSES.map((st) => {
                    const active = cur.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        tabIndex={-1}
                        onClick={() => setStatus([r.studentId], st)}
                        className={`h-8 px-2.5 text-xs font-medium rounded-[calc(var(--radius-md)-2px)] border transition ${
                          active ? ACTIVE[st] : 'border-transparent text-muted hover:text-text hover:bg-surface'
                        }`}
                      >
                        {LABEL[st]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(cur.status && cur.status !== 'present') || cur.note ? (
                <input
                  className="input text-xs h-9"
                  placeholder="Optional note (e.g. left early, medical)"
                  value={cur.note}
                  onChange={(e) => setNote(r.studentId, e.target.value)}
                  maxLength={300}
                  aria-label={`Note for ${r.name}`}
                />
              ) : null}
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No learner matches “{q}”.</li>}
      </ul>

      {/* Sticky save bar */}
      <div className="sticky bottom-16 md:bottom-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-surface/95 backdrop-blur">
        <p className="text-xs text-muted">
          {roster.length - counts.unmarked} of {roster.length} marked
          {dirty.length > 0 && <b className="text-warning"> · {dirty.length} unsaved</b>}
        </p>
        <button type="button" onClick={() => save()} disabled={pending || dirty.length === 0} className="btn-primary h-10 px-5">
          {pending ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'Saved'}
        </button>
      </div>
    </Panel>
  );
}
