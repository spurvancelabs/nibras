import 'server-only';
import { db } from './db';
import Attendance from '@/models/Attendance';
import Program from '@/models/Program';
import Session from '@/models/Session';
import type { AttendanceStatus } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttendanceRosterRow = {
  studentId: string;
  name: string;
  email: string;
  avatar: string;
  status: AttendanceStatus | null;
  note: string;
  /** When this record was last saved (ISO) — used to detect edit conflicts. */
  markedAt: string | null;
  memberId?: string;
};

export type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
};

export type ProgramAttendanceSummary = {
  programId: string;
  programName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number; // total records marked
  attendanceRate: number; // (present + late) / (present + absent + late) — excused excluded
};

export type StudentSessionRow = {
  sessionId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  programId: string;
  programName: string;
  status: AttendanceStatus | null;
  note: string;
};

// ---------------------------------------------------------------------------
// Session roster with attendance (for mentor panel)
// ---------------------------------------------------------------------------

type PopulatedStudent = {
  _id: unknown;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
  memberId?: string;
};

type AttendanceLean = {
  studentId: unknown;
  status: AttendanceStatus;
  note?: string;
  markedAt?: Date;
};

/**
 * Returns the roster of the program students for a session, joined with any
 * existing attendance records for that session.
 */
export async function getSessionAttendanceRoster(
  orgId: string,
  programId: string,
  sessionId: string
): Promise<AttendanceRosterRow[]> {
  await db();

  const [program, records] = await Promise.all([
    Program.findOne({ _id: programId, orgId })
      .populate('students', 'name email avatar status memberId')
      .lean(),
    Attendance.find({ orgId, sessionId }).lean(),
  ]);

  const students = ((program as unknown as { students?: PopulatedStudent[] })
    ?.students ?? []) as PopulatedStudent[];

  const byStudent = new Map<string, AttendanceLean>();
  for (const r of records as unknown as AttendanceLean[]) {
    byStudent.set(String(r.studentId), r);
  }

  return students
    .filter((s) => s.status !== 'disabled')
    .map((s) => {
      const sid = String(s._id);
      const rec = byStudent.get(sid);
      return {
        studentId: sid,
        name: s.name,
        email: s.email,
        avatar: s.avatar ?? '',
        status: rec?.status ?? null,
        note: rec?.note ?? '',
        markedAt: rec?.markedAt ? new Date(rec.markedAt).toISOString() : null,
        memberId: s.memberId ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Bulk upsert
// ---------------------------------------------------------------------------

export type AttendanceChange = { studentId: string; from: AttendanceStatus | null; to: AttendanceStatus; note: string };
export type AttendanceConflict = { studentId: string; status: AttendanceStatus | null; markedAt: string | null };

/**
 * Sets attendance for a set of students on a session. Upserts — safe to call
 * repeatedly. Empty entries are ignored (no accidental clearing).
 *
 * Conflict detection: pass `base` = the markedAt values the editor loaded.
 * If someone else saved one of those students since, nothing is written and
 * the conflicts are returned (unless `force`).
 * Only rows whose status or note actually change are written; the changes
 * are returned for the audit log.
 */
export async function setSessionAttendance(input: {
  orgId: string;
  programId: string;
  sessionId: string;
  markedBy: string;
  entries: AttendanceEntry[];
  base?: Record<string, string | null>;
  force?: boolean;
}): Promise<
  | { ok: true; count: number; changes: AttendanceChange[] }
  | { ok: false; error: string; conflicts?: AttendanceConflict[] }
> {
  await db();

  // Verify session belongs to org + program
  const session = await Session.findOne({
    _id: input.sessionId,
    orgId: input.orgId,
    programId: input.programId,
  })
    .select('_id')
    .lean();
  if (!session) return { ok: false, error: 'Session not found' };

  if (input.entries.length === 0) return { ok: true, count: 0, changes: [] };

  // Only students enrolled in the program can be marked.
  const program = (await Program.findOne({ _id: input.programId, orgId: input.orgId }).select('students').lean()) as { students?: unknown[] } | null;
  const enrolled = new Set((program?.students ?? []).map(String));
  const entries = input.entries.filter((e) => enrolled.has(e.studentId));
  if (entries.length !== input.entries.length) return { ok: false, error: 'Some people are not learners in this program.' };

  const existing = (await Attendance.find({
    orgId: input.orgId,
    sessionId: input.sessionId,
    studentId: { $in: entries.map((e) => e.studentId) },
  })
    .select('studentId status note markedAt')
    .lean()) as unknown as AttendanceLean[];
  const before = new Map(existing.map((r) => [String(r.studentId), r]));

  if (input.base && !input.force) {
    const conflicts: AttendanceConflict[] = [];
    for (const e of entries) {
      if (!(e.studentId in input.base)) continue;
      const cur = before.get(e.studentId);
      const curAt = cur?.markedAt ? new Date(cur.markedAt).toISOString() : null;
      if (curAt !== input.base[e.studentId]) conflicts.push({ studentId: e.studentId, status: cur?.status ?? null, markedAt: curAt });
    }
    if (conflicts.length) return { ok: false, error: 'Someone else changed this attendance while you were editing.', conflicts };
  }

  const changes: AttendanceChange[] = [];
  const now = new Date();
  const ops = [];
  for (const e of entries) {
    const note = (e.note ?? '').slice(0, 300);
    const prev = before.get(e.studentId);
    if (prev && prev.status === e.status && (prev.note ?? '') === note) continue;
    changes.push({ studentId: e.studentId, from: prev?.status ?? null, to: e.status, note });
    ops.push({
      updateOne: {
        filter: { orgId: input.orgId, sessionId: input.sessionId, studentId: e.studentId },
        update: {
          $set: {
            orgId: input.orgId,
            programId: input.programId,
            sessionId: input.sessionId,
            studentId: e.studentId,
            status: e.status,
            note,
            markedBy: input.markedBy,
            markedAt: now,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) await Attendance.bulkWrite(ops, { ordered: false });
  return { ok: true, count: ops.length, changes };
}

// ---------------------------------------------------------------------------
// Student's own attendance for a single session
// ---------------------------------------------------------------------------

export async function getMySessionAttendance(
  orgId: string,
  sessionId: string,
  studentId: string
): Promise<{ status: AttendanceStatus; note: string } | null> {
  await db();
  const rec = await Attendance.findOne({ orgId, sessionId, studentId })
    .select('status note')
    .lean();
  if (!rec) return null;
  return {
    status: rec.status as AttendanceStatus,
    note: (rec.note as string) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Student summary across programs
// ---------------------------------------------------------------------------

export async function getStudentAttendanceSummary(
  orgId: string,
  studentId: string
): Promise<ProgramAttendanceSummary[]> {
  await db();

  const rows = await Attendance.find({ orgId, studentId })
    .populate('programId', 'name')
    .lean();

  const byProgram = new Map<
    string,
    {
      programId: string;
      programName: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
    }
  >();

  for (const r of rows as unknown as {
    programId: { _id: unknown; name: string } | null;
    status: AttendanceStatus;
  }[]) {
    const pid = r.programId ? String(r.programId._id) : '';
    const pname = r.programId?.name ?? 'Unknown';
    if (!byProgram.has(pid)) {
      byProgram.set(pid, {
        programId: pid,
        programName: pname,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    }
    const bucket = byProgram.get(pid)!;
    bucket[r.status]++;
  }

  return Array.from(byProgram.values())
    .map((b) => {
      const total = b.present + b.absent + b.late + b.excused;
      const denom = b.present + b.absent + b.late;
      return {
        ...b,
        total,
        attendanceRate: denom > 0 ? (b.present + b.late) / denom : 0,
      };
    })
    .sort((a, b) => a.programName.localeCompare(b.programName));
}

// ---------------------------------------------------------------------------
// Student's per-session history (for /attendance page)
// ---------------------------------------------------------------------------

export async function getStudentSessionHistory(
  orgId: string,
  studentId: string,
  limit = 100
): Promise<StudentSessionRow[]> {
  await db();

  const records = await Attendance.find({ orgId, studentId })
    .sort({ markedAt: -1 })
    .limit(limit)
    .populate('sessionId', 'title startsAt')
    .populate('programId', 'name')
    .lean();

  return (
    records as unknown as {
      sessionId: { _id: unknown; title: string; startsAt: Date } | null;
      programId: { _id: unknown; name: string } | null;
      status: AttendanceStatus;
      note?: string;
    }[]
  )
    .filter((r) => r.sessionId)
    .map((r) => ({
      sessionId: String(r.sessionId!._id),
      sessionTitle: r.sessionId!.title,
      sessionStartsAt: new Date(r.sessionId!.startsAt).toISOString(),
      programId: r.programId ? String(r.programId._id) : '',
      programName: r.programId?.name ?? 'Unknown',
      status: r.status,
      note: r.note ?? '',
    }));
}

// ---------------------------------------------------------------------------
// Aggregate rate for a program (mentor/admin view)
// ---------------------------------------------------------------------------

export async function getProgramAttendanceRate(
  orgId: string,
  programId: string
): Promise<{
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}> {
  await db();
  const rows = await Attendance.find({ orgId, programId })
    .select('status')
    .lean();

  let present = 0,
    absent = 0,
    late = 0,
    excused = 0;
  for (const r of rows as unknown as { status: AttendanceStatus }[]) {
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'excused') excused++;
  }
  const denom = present + absent + late;
  return {
    present,
    absent,
    late,
    excused,
    rate: denom > 0 ? (present + late) / denom : 0,
  };
}