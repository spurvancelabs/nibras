// =============================================================================
// FILE: lib/attendance-reports.ts   (NEW FILE — server only)
// Attendance reports for mentors and admins:
//   - per-learner rate, counts, current absence streak, last seen
//   - flags: below the threshold / repeated absences (Settings → Attendance)
//   - sessions that already happened but have no attendance yet
//   - one learner's full history across programs
// Scope: admins see every program; mentors only the programs they teach.
// Rate = (present + late) / (present + absent + late) — excused is left out,
// matching the learner's own Attendance page.
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import Session from '@/models/Session';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import type { AttendanceStatus } from './constants';

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

export type Viewer = { id: string; orgId: string; role: string };

export type LearnerAttendance = {
  studentId: string;
  name: string;
  email: string;
  memberId: string;
  programs: string[];
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Sessions in range with no record for this learner. */
  unmarked: number;
  rate: number | null;
  /** Absences in a row, most recent first (excused does not break or count). */
  streak: number;
  lastSeen: string | null;
  low: boolean;
  repeated: boolean;
};

export type MissingSession = { id: string; title: string; programName: string; startsAt: string; marked: number; enrolled: number };

export type AttendanceOverview = {
  programs: { id: string; name: string }[];
  learners: LearnerAttendance[];
  missing: MissingSession[];
  totals: { sessions: number; records: number; avgRate: number | null; low: number; repeated: number };
};

export function rateOf(c: { present: number; absent: number; late: number }): number | null {
  const d = c.present + c.absent + c.late;
  return d > 0 ? (c.present + c.late) / d : null;
}

/** Absences in a row from the most recent session backwards (excused skipped). */
export function absenceStreak(statusesNewestFirst: (AttendanceStatus | null)[]): number {
  let n = 0;
  for (const s of statusesNewestFirst) {
    if (s === 'excused' || s === null) continue;
    if (s === 'absent') n++;
    else break;
  }
  return n;
}

export async function visiblePrograms(v: Viewer): Promise<{ id: string; name: string; students: string[] }[]> {
  await db();
  const q: Record<string, unknown> = { orgId: oid(v.orgId), status: { $ne: 'draft' } };
  if (v.role !== 'admin') q.mentors = oid(v.id);
  const rows = (await Program.find(q).select('name students').sort({ name: 1 }).lean()) as { _id: unknown; name: string; students?: unknown[] }[];
  return rows.map((p) => ({ id: String(p._id), name: p.name, students: (p.students ?? []).map(String) }));
}

export async function attendanceOverview(
  v: Viewer,
  opts: { programId?: string; days?: number; threshold: number; streakAlert: number }
): Promise<AttendanceOverview> {
  await db();
  const all = await visiblePrograms(v);
  const programs = opts.programId ? all.filter((p) => p.id === opts.programId) : all;
  const empty: AttendanceOverview = { programs: all.map(({ id, name }) => ({ id, name })), learners: [], missing: [], totals: { sessions: 0, records: 0, avgRate: null, low: 0, repeated: 0 } };
  if (!programs.length) return empty;

  const now = new Date();
  const since = opts.days ? new Date(now.getTime() - opts.days * DAY) : null;
  const sessQ: Record<string, unknown> = {
    orgId: oid(v.orgId),
    programId: { $in: programs.map((p) => oid(p.id)) },
    startsAt: since ? { $lte: now, $gte: since } : { $lte: now },
    status: { $ne: 'cancelled' },
  };
  const sessions = (await Session.find(sessQ).select('title programId startsAt').sort({ startsAt: -1 }).limit(3000).lean()) as {
    _id: unknown;
    title: string;
    programId: unknown;
    startsAt: Date;
  }[];
  const sessionIds = sessions.map((s) => s._id);
  const records = sessionIds.length
    ? ((await Attendance.find({ orgId: oid(v.orgId), sessionId: { $in: sessionIds } })
        .select('sessionId studentId status')
        .lean()) as { sessionId: unknown; studentId: unknown; status: AttendanceStatus }[])
    : [];

  // index records by session → student
  const bySession = new Map<string, Map<string, AttendanceStatus>>();
  for (const r of records) {
    const sid = String(r.sessionId);
    if (!bySession.has(sid)) bySession.set(sid, new Map());
    bySession.get(sid)!.set(String(r.studentId), r.status);
  }

  const programName = new Map(programs.map((p) => [p.id, p.name]));
  const studentPrograms = new Map<string, Set<string>>();
  for (const p of programs) for (const s of p.students) {
    if (!studentPrograms.has(s)) studentPrograms.set(s, new Set());
    studentPrograms.get(s)!.add(p.id);
  }
  const studentIds = [...studentPrograms.keys()];
  const users = (await User.find({ _id: { $in: studentIds.map(oid) }, orgId: oid(v.orgId), role: 'student' })
    .select('name email memberId status')
    .lean()) as { _id: unknown; name: string; email: string; memberId?: string; status?: string }[];

  const learners: LearnerAttendance[] = [];
  for (const u of users) {
    if (u.status === 'disabled') continue;
    const id = String(u._id);
    const myPrograms = studentPrograms.get(id) ?? new Set();
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    const timeline: (AttendanceStatus | null)[] = [];
    let lastSeen: string | null = null;
    for (const s of sessions) {
      if (!myPrograms.has(String(s.programId))) continue;
      const st = bySession.get(String(s._id))?.get(id) ?? null;
      if (st) c[st]++;
      else if (bySession.has(String(s._id))) c.unmarked++; // register taken but this learner missing
      timeline.push(st);
      if (!lastSeen && (st === 'present' || st === 'late')) lastSeen = new Date(s.startsAt).toISOString();
    }
    const rate = rateOf(c);
    const streak = absenceStreak(timeline);
    const marked = c.present + c.absent + c.late;
    learners.push({
      studentId: id,
      name: u.name,
      email: u.email,
      memberId: u.memberId ?? '',
      programs: [...myPrograms].map((p) => programName.get(p) ?? ''),
      ...c,
      rate,
      streak,
      lastSeen,
      low: rate !== null && marked >= 3 && rate * 100 < opts.threshold,
      repeated: opts.streakAlert > 0 && streak >= opts.streakAlert,
    });
  }
  learners.sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2) || a.name.localeCompare(b.name));

  // Sessions that happened (ended) but have no records at all
  const enrolledCount = new Map(programs.map((p) => [p.id, p.students.length]));
  const missing: MissingSession[] = sessions
    .filter((s) => !bySession.has(String(s._id)) && (enrolledCount.get(String(s.programId)) ?? 0) > 0 && new Date(s.startsAt).getTime() < now.getTime() - 3600_000)
    .slice(0, 50)
    .map((s) => ({
      id: String(s._id),
      title: s.title,
      programName: programName.get(String(s.programId)) ?? '',
      startsAt: new Date(s.startsAt).toISOString(),
      marked: 0,
      enrolled: enrolledCount.get(String(s.programId)) ?? 0,
    }));

  const rates = learners.map((l) => l.rate).filter((r): r is number => r !== null);
  return {
    programs: all.map(({ id, name }) => ({ id, name })),
    learners,
    missing,
    totals: {
      sessions: sessions.length,
      records: records.length,
      avgRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      low: learners.filter((l) => l.low).length,
      repeated: learners.filter((l) => l.repeated).length,
    },
  };
}

export type LearnerHistoryRow = { sessionId: string; title: string; programName: string; startsAt: string; status: AttendanceStatus | null; note: string };

/** One learner's history in the viewer's programs (staff view). */
export async function learnerHistory(v: Viewer, studentId: string): Promise<{ name: string; email: string; rows: LearnerHistoryRow[] } | null> {
  if (!Types.ObjectId.isValid(studentId)) return null;
  await db();
  const progs = (await visiblePrograms(v)).filter((p) => p.students.includes(studentId));
  if (!progs.length) return null;
  const u = (await User.findOne({ _id: oid(studentId), orgId: oid(v.orgId) }).select('name email').lean()) as { name: string; email: string } | null;
  if (!u) return null;
  const sessions = (await Session.find({
    orgId: oid(v.orgId),
    programId: { $in: progs.map((p) => oid(p.id)) },
    startsAt: { $lte: new Date() },
    status: { $ne: 'cancelled' },
  })
    .select('title programId startsAt')
    .sort({ startsAt: -1 })
    .limit(500)
    .lean()) as { _id: unknown; title: string; programId: unknown; startsAt: Date }[];
  const recs = (await Attendance.find({ orgId: oid(v.orgId), studentId: oid(studentId), sessionId: { $in: sessions.map((s) => s._id) } })
    .select('sessionId status note')
    .lean()) as { sessionId: unknown; status: AttendanceStatus; note?: string }[];
  const map = new Map(recs.map((r) => [String(r.sessionId), r]));
  const pname = new Map(progs.map((p) => [p.id, p.name]));
  return {
    name: u.name,
    email: u.email,
    rows: sessions.map((s) => {
      const r = map.get(String(s._id));
      return {
        sessionId: String(s._id),
        title: s.title,
        programName: pname.get(String(s.programId)) ?? '',
        startsAt: new Date(s.startsAt).toISOString(),
        status: r?.status ?? null,
        note: r?.note ?? '',
      };
    }),
  };
}

/** CSV for the overview (staff export). Values are escaped against formula injection. */
export function overviewCsv(o: AttendanceOverview, threshold: number): string {
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Name', 'Email', 'Member ID', 'Programs', 'Present', 'Late', 'Absent', 'Excused', 'Not marked', 'Rate %', 'Absences in a row', `Below ${threshold}%`, 'Last attended'];
  const lines = o.learners.map((l) =>
    [
      l.name,
      l.email,
      l.memberId,
      l.programs.join('; '),
      l.present,
      l.late,
      l.absent,
      l.excused,
      l.unmarked,
      l.rate === null ? '' : Math.round(l.rate * 100),
      l.streak,
      l.low ? 'yes' : '',
      l.lastSeen ? l.lastSeen.slice(0, 10) : '',
    ]
      .map(esc)
      .join(',')
  );
  return '﻿' + [head.join(','), ...lines].join('\n');
}
