// =============================================================================
// FILE: lib/progress.ts   (NEW FILE — server only)
// Per-student progress in a program. Used by the program page, the gradebook
// and certificate eligibility, so all three always agree.
//
//   attendance  = (present + late) ÷ (present + late + absent); excused ignored
//                 (same rule as the Attendance page)
//   assignments = average of marks ÷ max over assignments that are graded, or
//                 past due with no submission (= 0). Ungraded work is skipped.
//   quizzes     = average best % over published quizzes that were attempted,
//                 or are closed and were missed (= 0).
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import User from '@/models/User';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import Attendance from '@/models/Attendance';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type StudentProgress = {
  studentId: string;
  name: string;
  email: string;
  memberId: string;
  avatar: string;
  attendance: { present: number; late: number; absent: number; excused: number; percent: number | null };
  assignments: { total: number; submitted: number; graded: number; percent: number | null };
  quizzes: { total: number; attempted: number; percent: number | null };
};

export type GradebookColumn = { id: string; title: string; kind: 'assignment' | 'quiz'; max: number; dueAt: string | null };

export type GradebookCell = { value: number | null; label: string; state: 'graded' | 'submitted' | 'missing' | 'late' | 'pending' | 'best' };

export type ProgramProgress = {
  programId: string;
  columns: GradebookColumn[];
  students: (StudentProgress & { cells: Record<string, GradebookCell> })[];
};

const pct = (n: number) => Math.round(n * 1000) / 10;

export async function computeProgramProgress(orgId: string, programId: string, onlyStudentIds?: string[]): Promise<ProgramProgress | null> {
  if (!Types.ObjectId.isValid(programId)) return null;
  await db();
  const program = (await Program.findOne({ _id: programId, orgId }).select('students').lean()) as any;
  if (!program) return null;
  let studentIds: string[] = (program.students ?? []).map(String);
  if (onlyStudentIds) studentIds = studentIds.filter((s) => onlyStudentIds.includes(s));

  const now = new Date();
  const [students, assignments, attendance, quizzes] = await Promise.all([
    User.find({ _id: { $in: studentIds }, orgId }).select('name email memberId avatar').sort({ name: 1 }).lean() as Promise<any[]>,
    Assignment.find({ orgId, programId }).select('title dueAt maxMarks').sort({ dueAt: 1 }).lean() as Promise<any[]>,
    Attendance.find({ orgId, programId, studentId: { $in: studentIds } }).select('studentId status').lean() as Promise<any[]>,
    Quiz.find({ orgId, programId, status: { $in: ['published', 'closed'] } }).select('title closesAt status questions.points createdAt').sort({ createdAt: 1 }).lean() as Promise<any[]>,
  ]);

  const [submissions, bestAttempts] = await Promise.all([
    Submission.find({ orgId, assignmentId: { $in: assignments.map((a) => a._id) }, studentId: { $in: studentIds } })
      .select('assignmentId studentId marks submittedAt')
      .lean() as Promise<any[]>,
    QuizAttempt.aggregate([
      { $match: { quizId: { $in: quizzes.map((q) => q._id) }, studentId: { $in: studentIds.map((s) => new Types.ObjectId(s)) }, status: 'submitted' } },
      { $group: { _id: { q: '$quizId', s: '$studentId' }, best: { $max: '$percent' }, review: { $max: '$needsReview' } } },
    ]) as Promise<{ _id: { q: unknown; s: unknown }; best: number; review: boolean }[]>,
  ]);

  const subMap = new Map(submissions.map((s) => [`${s.assignmentId}:${s.studentId}`, s]));
  const bestMap = new Map(bestAttempts.map((b) => [`${String(b._id.q)}:${String(b._id.s)}`, b]));

  const columns: GradebookColumn[] = [
    ...assignments.map((a) => ({ id: String(a._id), title: a.title as string, kind: 'assignment' as const, max: a.maxMarks ?? 100, dueAt: a.dueAt ? new Date(a.dueAt).toISOString() : null })),
    ...quizzes.map((q) => ({
      id: String(q._id),
      title: q.title as string,
      kind: 'quiz' as const,
      max: 100,
      dueAt: q.closesAt ? new Date(q.closesAt).toISOString() : null,
    })),
  ];

  const rows = students.map((s) => {
    const sid = String(s._id);
    const att = { present: 0, late: 0, absent: 0, excused: 0 };
    for (const a of attendance) if (String(a.studentId) === sid && a.status in att) att[a.status as keyof typeof att]++;
    const attDen = att.present + att.late + att.absent;

    const cells: Record<string, GradebookCell> = {};
    let aSum = 0;
    let aCount = 0;
    let submitted = 0;
    let graded = 0;
    for (const a of assignments) {
      const sub = subMap.get(`${a._id}:${sid}`);
      const due = a.dueAt ? new Date(a.dueAt) : null;
      const max = a.maxMarks || 100;
      if (sub) submitted++;
      if (sub && sub.marks !== null && sub.marks !== undefined) {
        graded++;
        aSum += Math.min(1, Math.max(0, sub.marks / max));
        aCount++;
        const late = due && sub.submittedAt && new Date(sub.submittedAt) > due;
        cells[String(a._id)] = { value: sub.marks, label: `${sub.marks}/${max}`, state: late ? 'late' : 'graded' };
      } else if (sub) {
        cells[String(a._id)] = { value: null, label: 'submitted', state: 'submitted' };
      } else if (due && due < now) {
        aCount++;
        cells[String(a._id)] = { value: 0, label: 'missing', state: 'missing' };
      } else {
        cells[String(a._id)] = { value: null, label: '—', state: 'pending' };
      }
    }

    let qSum = 0;
    let qCount = 0;
    let attempted = 0;
    for (const q of quizzes) {
      const b = bestMap.get(`${q._id}:${sid}`);
      const closed = q.status === 'closed' || (q.closesAt && new Date(q.closesAt) <= now);
      if (b) {
        attempted++;
        qSum += b.best;
        qCount++;
        cells[String(q._id)] = { value: b.best, label: `${b.best}%${b.review ? '*' : ''}`, state: 'best' };
      } else if (closed) {
        qCount++;
        cells[String(q._id)] = { value: 0, label: 'missed', state: 'missing' };
      } else {
        cells[String(q._id)] = { value: null, label: '—', state: 'pending' };
      }
    }

    return {
      studentId: sid,
      name: s.name as string,
      email: s.email as string,
      memberId: (s.memberId as string) ?? '',
      avatar: (s.avatar as string) ?? '',
      attendance: { ...att, percent: attDen ? pct((att.present + att.late) / attDen) : null },
      assignments: { total: assignments.length, submitted, graded, percent: aCount ? pct(aSum / aCount) : null },
      quizzes: { total: quizzes.length, attempted, percent: qCount ? Math.round((qSum / qCount) * 10) / 10 : null },
      cells,
    };
  });

  return { programId, columns, students: rows };
}
