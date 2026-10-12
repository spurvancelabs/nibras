import 'server-only';
import { db } from './db';
import Submission from '@/models/Submission';
import Assignment from '@/models/Assignment';
import User from '@/models/User';
import Program from '@/models/Program';
import type { AttachmentMeta } from '@/models/Assignment';
import type { SubmissionState } from '@/lib/constants';

export type SubmissionView = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;

  text: string;
  attachments: AttachmentMeta[];
  submittedAt: string;
  isLate: boolean;

  marks: number | null;
  maxMarks: number;
  feedback: string;
  gradedAt: string | null;
  gradedById: string | null;
  gradedByName: string | null;

  state: SubmissionState;
};

type LeanRow = {
  _id: unknown;
  assignmentId: unknown;
  studentId: { _id: unknown; name: string; email: string; avatar?: string } | null;
  text?: string;
  attachments?: AttachmentMeta[];
  submittedAt: Date;
  marks: number | null;
  feedback?: string;
  gradedAt: Date | null;
  gradedBy: { _id: unknown; name: string } | null;
};

function map(row: LeanRow, dueAt: Date, maxMarks: number): SubmissionView {
  const graded = !!row.gradedAt;
  const late = new Date(row.submittedAt).getTime() > dueAt.getTime();
  const state: SubmissionState = graded ? 'graded' : 'submitted';

  return {
    id: String(row._id),
    assignmentId: String(row.assignmentId),
    studentId: row.studentId ? String(row.studentId._id) : '',
    studentName: row.studentId?.name ?? 'Unknown',
    studentEmail: row.studentId?.email ?? '',
    studentAvatar: row.studentId?.avatar ?? '',
    text: row.text ?? '',
    attachments: row.attachments ?? [],
    submittedAt: new Date(row.submittedAt).toISOString(),
    isLate: late,
    marks: row.marks,
    maxMarks,
    feedback: row.feedback ?? '',
    gradedAt: row.gradedAt ? new Date(row.gradedAt).toISOString() : null,
    gradedById: row.gradedBy ? String(row.gradedBy._id) : null,
    gradedByName: row.gradedBy?.name ?? null,
    state,
  };
}

export async function getMySubmission(
  orgId: string,
  assignmentId: string,
  studentId: string,
  dueAt: Date,
  maxMarks: number
): Promise<SubmissionView | null> {
  await db();
  const row = await Submission.findOne({ orgId, assignmentId, studentId })
    .populate('studentId', 'name email avatar')
    .populate('gradedBy', 'name')
    .lean();
  if (!row) return null;
  return map(row as unknown as LeanRow, dueAt, maxMarks);
}

export async function listSubmissionsForAssignment(
  orgId: string,
  assignmentId: string,
  dueAt: Date,
  maxMarks: number
): Promise<SubmissionView[]> {
  await db();
  const rows = await Submission.find({ orgId, assignmentId })
    .sort({ submittedAt: -1 })
    .populate('studentId', 'name email avatar')
    .populate('gradedBy', 'name')
    .lean();
  return (rows as unknown as LeanRow[]).map((r) => map(r, dueAt, maxMarks));
}

/** Program students with a "submitted" / "pending" flag, for the mentor view. */
export type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  avatar: string;
  submitted: boolean;
  submission: SubmissionView | null;
};

export async function getAssignmentRoster(
  orgId: string,
  programId: string,
  assignmentId: string,
  dueAt: Date,
  maxMarks: number
): Promise<RosterRow[]> {
  await db();

  const [program, subs] = await Promise.all([
    Program.findOne({ _id: programId, orgId })
      .populate('students', 'name email avatar status')
      .lean(),
    listSubmissionsForAssignment(orgId, assignmentId, dueAt, maxMarks),
  ]);

  const students = ((program as any)?.students ?? []) as Array<{
    _id: unknown;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
  }>;

  const byStudent = new Map<string, SubmissionView>();
  for (const s of subs) byStudent.set(s.studentId, s);

  return students
    .filter((s) => s.status !== 'disabled')
    .map((s) => {
      const sid = String(s._id);
      const sub = byStudent.get(sid) ?? null;
      return {
        studentId: sid,
        name: s.name,
        email: s.email,
        avatar: s.avatar ?? '',
        submitted: !!sub,
        submission: sub,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Upserts a student submission. If already graded, refuses.
 * Sets submittedAt to now.
 */
export async function submitAssignment(input: {
  orgId: string;
  assignmentId: string;
  studentId: string;
  text?: string;
  attachments?: AttachmentMeta[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const assignment = await Assignment.findOne({
    _id: input.assignmentId,
    orgId: input.orgId,
  })
    .select('dueAt allowLate')
    .lean();
  if (!assignment) return { ok: false, error: 'Assignment not found' };

  const now = new Date();
  const late = now.getTime() > new Date(assignment.dueAt).getTime();
  if (late && !assignment.allowLate) {
    return { ok: false, error: 'Late submissions are not allowed' };
  }

  const existing = await Submission.findOne({
    orgId: input.orgId,
    assignmentId: input.assignmentId,
    studentId: input.studentId,
  }).select('gradedAt _id').lean();

  if (existing?.gradedAt) {
    return { ok: false, error: 'Submission already graded — cannot resubmit' };
  }

  if (existing) {
    await Submission.updateOne(
      { _id: existing._id },
      {
        $set: {
          text: input.text ?? '',
          attachments: input.attachments ?? [],
          submittedAt: now,
        },
      }
    );
    return { ok: true, id: String(existing._id) };
  }

  const doc = await Submission.create({
    orgId: input.orgId,
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    text: input.text ?? '',
    attachments: input.attachments ?? [],
    submittedAt: now,
  });
  return { ok: true, id: String(doc._id) };
}

export async function gradeSubmission(input: {
  orgId: string;
  submissionId: string;
  marks: number;
  feedback: string;
  gradedBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const sub = await Submission.findOne({
    _id: input.submissionId,
    orgId: input.orgId,
  })
    .select('assignmentId')
    .lean();
  if (!sub) return { ok: false, error: 'Submission not found' };

  const assignment = await Assignment.findOne({
    _id: sub.assignmentId,
    orgId: input.orgId,
  })
    .select('maxMarks')
    .lean();
  if (!assignment) return { ok: false, error: 'Assignment not found' };

  if (input.marks < 0 || input.marks > assignment.maxMarks) {
    return { ok: false, error: `Marks must be between 0 and ${assignment.maxMarks}` };
  }

  await Submission.updateOne(
    { _id: input.submissionId },
    {
      $set: {
        marks: input.marks,
        feedback: input.feedback,
        gradedAt: new Date(),
        gradedBy: input.gradedBy,
      },
    }
  );

  return { ok: true };
}

export async function ungradeSubmission(
  orgId: string,
  submissionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  await Submission.updateOne(
    { _id: submissionId, orgId },
    { $set: { marks: null, feedback: '', gradedAt: null, gradedBy: null } }
  );
  return { ok: true };
}

export async function getSubmissionById(
  orgId: string,
  id: string,
  dueAt: Date,
  maxMarks: number
): Promise<SubmissionView | null> {
  await db();
  const row = await Submission.findOne({ _id: id, orgId })
    .populate('studentId', 'name email avatar')
    .populate('gradedBy', 'name')
    .lean();
  if (!row) return null;
  return map(row as unknown as LeanRow, dueAt, maxMarks);
}