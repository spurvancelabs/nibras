import 'server-only';
import { db } from './db';
import Assignment, { type AttachmentMeta } from '@/models/Assignment';
import Submission from '@/models/Submission';
import Program from '@/models/Program';
import User from '@/models/User';
import type { SubmissionState } from '@/lib/constants';

export type AssignmentAttachment = AttachmentMeta;

export type AssignmentListItem = {
  id: string;
  title: string;
  description: string;
  programId: string;
  programName: string;
  sessionId: string | null;
  dueAt: string;
  maxMarks: number;
  allowLate: boolean;
  attachments: AssignmentAttachment[];
  createdById: string;
  createdByName: string;
  createdAt: string;

  // For student context
  mySubmission: {
    id: string;
    state: SubmissionState;
    submittedAt: string;
    marks: number | null;
    maxMarks: number;
    feedback: string;
    gradedAt: string | null;
  } | null;
  myState?: SubmissionState;

  // For mentor/admin context
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
};

type LeanRow = {
  _id: unknown;
  title: string;
  description?: string;
  programId: { _id: unknown; name: string } | null;
  sessionId: unknown;
  dueAt: Date;
  maxMarks: number;
  allowLate: boolean;
  attachments?: AttachmentMeta[];
  createdBy: { _id: unknown; name: string } | null;
  createdAt: Date;
};

function computeState(
  dueAt: Date,
  sub: { gradedAt: Date | null } | null | undefined,
  now: Date
): SubmissionState {
  if (sub?.gradedAt) return 'graded';
  if (sub) return 'submitted';
  return dueAt.getTime() < now.getTime() ? 'overdue' : 'pending';
}

/**
 * Returns assignments visible to the user, decorated with context.
 * - admin: all assignments in org
 * - mentor: assignments in programs they mentor
 * - student: assignments in programs they're enrolled in + their own submission
 */
export async function listAssignments(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' }
): Promise<AssignmentListItem[]> {
  await db();

  // Program scope
  let programIds: string[] | null = null;
  if (user.role !== 'admin') {
    const field = user.role === 'mentor' ? 'mentors' : 'students';
    const programs = await Program.find({ orgId, [field]: user.id })
      .select('_id')
      .lean();
    programIds = programs.map((p) => String(p._id));
    if (programIds.length === 0) return [];
  }

  const query: Record<string, unknown> = { orgId };
  if (programIds) query.programId = { $in: programIds };

  const rows = await Assignment.find(query)
    .sort({ dueAt: -1 })
    .limit(300)
    .populate('programId', 'name')
    .populate('createdBy', 'name')
    .lean();

  const assignmentIds = rows.map((r) => r._id);
  const now = new Date();

  // Pull stats + student's own submissions in bulk
  const [allSubs, programStudentCounts] = await Promise.all([
    Submission.find({ orgId, assignmentId: { $in: assignmentIds } })
      .select('assignmentId studentId marks gradedAt submittedAt feedback')
      .lean(),
    // Count students per program so we can show X/Y submitted
    programIds
      ? Program.find({ orgId, _id: { $in: programIds } })
          .select('_id students')
          .lean()
      : Program.find({ orgId })
          .select('_id students')
          .lean(),
  ]);

  const studentCountByProgram = new Map<string, number>();
  for (const p of programStudentCounts) {
    studentCountByProgram.set(String(p._id), (p.students ?? []).length);
  }

  const subsByAssignment = new Map<string, typeof allSubs>();
  for (const s of allSubs) {
    const key = String(s.assignmentId);
    const arr = subsByAssignment.get(key) ?? [];
    arr.push(s);
    subsByAssignment.set(key, arr);
  }

  return (rows as unknown as LeanRow[]).map((r) => {
    const id = String(r._id);
    const subs = subsByAssignment.get(id) ?? [];

    let mySubmission: AssignmentListItem['mySubmission'] = null;
    let myState: SubmissionState | undefined;

    if (user.role === 'student') {
      const mine = subs.find((s) => String(s.studentId) === user.id);
      if (mine) {
        mySubmission = {
          id: String(mine._id),
          state: computeState(new Date(r.dueAt), { gradedAt: mine.gradedAt }, now),
          submittedAt: new Date(mine.submittedAt).toISOString(),
          marks: (mine.marks ?? null) as number | null,
          maxMarks: r.maxMarks,
          feedback: mine.feedback ?? '',
          gradedAt: mine.gradedAt ? new Date(mine.gradedAt).toISOString() : null,
        };
      }
      myState = computeState(
        new Date(r.dueAt),
        mine ? { gradedAt: mine.gradedAt } : null,
        now
      );
    }

    const submittedCount = subs.length;
    const gradedCount = subs.filter((s) => s.gradedAt).length;
    const totalStudents = r.programId
      ? studentCountByProgram.get(String(r.programId._id)) ?? 0
      : 0;

    return {
      id,
      title: r.title,
      description: r.description ?? '',
      programId: r.programId ? String(r.programId._id) : '',
      programName: r.programId?.name ?? 'Unknown',
      sessionId: r.sessionId ? String(r.sessionId) : null,
      dueAt: new Date(r.dueAt).toISOString(),
      maxMarks: r.maxMarks,
      allowLate: r.allowLate,
      attachments: r.attachments ?? [],
      createdById: r.createdBy ? String(r.createdBy._id) : '',
      createdByName: r.createdBy?.name ?? 'Unknown',
      createdAt: new Date(r.createdAt).toISOString(),
      mySubmission,
      myState,
      totalStudents,
      submittedCount,
      gradedCount,
    };
  });
}

export async function getAssignment(
  orgId: string,
  id: string
): Promise<AssignmentListItem | null> {
  await db();
  const r = await Assignment.findOne({ _id: id, orgId })
    .populate('programId', 'name')
    .populate('createdBy', 'name')
    .lean();
  if (!r) return null;

  const row = r as unknown as LeanRow;
  const program = row.programId
    ? await Program.findOne({ _id: row.programId._id, orgId })
        .select('students')
        .lean()
    : null;

  return {
    id: String(row._id),
    title: row.title,
    description: row.description ?? '',
    programId: row.programId ? String(row.programId._id) : '',
    programName: row.programId?.name ?? 'Unknown',
    sessionId: row.sessionId ? String(row.sessionId) : null,
    dueAt: new Date(row.dueAt).toISOString(),
    maxMarks: row.maxMarks,
    allowLate: row.allowLate,
    attachments: row.attachments ?? [],
    createdById: row.createdBy ? String(row.createdBy._id) : '',
    createdByName: row.createdBy?.name ?? 'Unknown',
    createdAt: new Date(row.createdAt).toISOString(),
    mySubmission: null,
    myState: undefined,
    totalStudents: (program?.students ?? []).length,
    submittedCount: 0,
    gradedCount: 0,
  };
}

/** Can this user manage (create/edit/delete) assignments in this program? */
export async function canManageProgramAssignments(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  programId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role !== 'mentor') return false;
  const p = await Program.findOne({
    _id: programId,
    orgId,
    mentors: user.id,
  })
    .select('_id')
    .lean();
  return !!p;
}

export async function createAssignment(input: {
  orgId: string;
  programId: string;
  sessionId?: string | null;
  title: string;
  description?: string;
  dueAt: string;
  maxMarks: number;
  allowLate?: boolean;
  attachments?: AttachmentMeta[];
  createdBy: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();
  const doc = await Assignment.create({
    orgId: input.orgId,
    programId: input.programId,
    sessionId: input.sessionId ?? null,
    title: input.title.trim(),
    description: input.description ?? '',
    dueAt: new Date(input.dueAt),
    maxMarks: input.maxMarks,
    allowLate: input.allowLate ?? true,
    attachments: input.attachments ?? [],
    createdBy: input.createdBy,
  });
  return { ok: true, id: String(doc._id) };
}

export async function updateAssignment(
  orgId: string,
  id: string,
  patch: {
    title?: string;
    description?: string;
    dueAt?: string;
    maxMarks?: number;
    allowLate?: boolean;
    attachments?: AttachmentMeta[];
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.dueAt !== undefined) set.dueAt = new Date(patch.dueAt);
  if (patch.maxMarks !== undefined) set.maxMarks = patch.maxMarks;
  if (patch.allowLate !== undefined) set.allowLate = patch.allowLate;
  if (patch.attachments !== undefined) set.attachments = patch.attachments;

  const res = await Assignment.updateOne({ _id: id, orgId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, error: 'Assignment not found' };
  return { ok: true };
}

export async function deleteAssignment(
  orgId: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  await Assignment.deleteOne({ _id: id, orgId });
  await Submission.deleteMany({ orgId, assignmentId: id });
  return { ok: true };
}

/** For dashboard: pending/overdue assignments for a student. */
export async function listUpcomingForStudent(
  orgId: string,
  studentId: string,
  limit = 5
): Promise<AssignmentListItem[]> {
  const all = await listAssignments(orgId, { id: studentId, role: 'student' });
  const now = Date.now();
  return all
    .filter(
      (a) =>
        a.myState === 'pending' &&
        new Date(a.dueAt).getTime() >= now - 24 * 3600 * 1000
    )
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
    .slice(0, limit);
}

/** For dashboard: assignments with pending grading for a mentor. */
export async function listToGradeForMentor(
  orgId: string,
  mentorId: string,
  limit = 5
): Promise<AssignmentListItem[]> {
  const all = await listAssignments(orgId, { id: mentorId, role: 'mentor' });
  return all
    .filter((a) => a.submittedCount > a.gradedCount)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
    .slice(0, limit);
}

/** Ensure the given user can view this assignment (student in program, mentor in program, or admin). */
export async function canViewAssignment(
  orgId: string,
  user: { id: string; role: 'admin' | 'mentor' | 'student' },
  programId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;
  const field = user.role === 'mentor' ? 'mentors' : 'students';
  const p = await Program.findOne({
    _id: programId,
    orgId,
    [field]: user.id,
  })
    .select('_id')
    .lean();
  return !!p;
}