// =============================================================================
// FILE: lib/learner-progress.ts   (NEW FILE — server only)
// A learner's progress: grades trend, on-time rate, attendance, quizzes,
// weekly learning streak, achievements and "what to do next".
// Everything is computed from existing records — nothing new to maintain,
// nothing that can drift out of sync.
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import Attendance from '@/models/Attendance';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import Certificate from '@/models/Certificate';
import { weekKey, weeklyStreak, computeAchievements, type Achievement } from './progress-core';

export type { Achievement };

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

export type Recommendation = { kind: 'assignment' | 'quiz' | 'feedback' | 'attendance'; title: string; detail: string; href: string; urgent: boolean };

export type Progress = {
  programs: number;
  submissions: number;
  onTime: number;
  onTimeRate: number | null;
  avgGrade: number | null;
  /** last 12 graded, oldest → newest, as % */
  gradeTrend: { label: string; pct: number }[];
  attendanceRate: number | null;
  sessionsMarked: number;
  quizzes: { attempted: number; passed: number; best: number | null };
  certificates: number;
  streak: { current: number; best: number; thisWeekActive: boolean; weeks: { key: string; active: boolean }[] };
  achievements: Achievement[];
  next: Recommendation[];
};

export async function learnerProgress(orgId: string, userId: string): Promise<Progress> {
  await db();
  const org = oid(orgId);
  const me = oid(userId);
  const progs = (await Program.find({ orgId: org, students: me }).select('_id name').lean()) as { _id: unknown; name: string }[];
  const progIds = progs.map((p) => p._id);
  const now = Date.now();

  const [assignments, subs, att, quizzes, attempts, certs] = await Promise.all([
    Assignment.find({ orgId: org, programId: { $in: progIds } }).select('title dueAt maxMarks').lean() as Promise<{ _id: unknown; title: string; dueAt: Date; maxMarks: number }[]>,
    Submission.find({ orgId: org, studentId: me }).select('assignmentId submittedAt marks gradedAt').lean() as Promise<
      { assignmentId: unknown; submittedAt: Date; marks: number | null; gradedAt?: Date | null }[]
    >,
    Attendance.find({ orgId: org, studentId: me }).select('status markedAt').lean() as Promise<{ status: string; markedAt?: Date }[]>,
    Quiz.find({ orgId: org, programId: { $in: progIds }, status: 'published' }).select('title closesAt opensAt').lean() as Promise<
      { _id: unknown; title: string; closesAt?: Date | null; opensAt?: Date | null }[]
    >,
    QuizAttempt.find({ orgId: org, studentId: me, status: 'submitted' }).select('quizId percent passed submittedAt').lean() as Promise<
      { quizId: unknown; percent: number; passed: boolean; submittedAt?: Date | null }[]
    >,
    Certificate.countDocuments({ orgId: org, studentId: me, status: 'issued' }),
  ]);

  const amap = new Map(assignments.map((a) => [String(a._id), a]));
  let onTime = 0;
  const graded: { at: number; pct: number; title: string }[] = [];
  for (const s of subs) {
    const a = amap.get(String(s.assignmentId));
    if (!a) continue;
    if (new Date(s.submittedAt).getTime() <= new Date(a.dueAt).getTime()) onTime++;
    if (s.marks !== null && s.marks !== undefined && a.maxMarks > 0) graded.push({ at: new Date(s.gradedAt ?? s.submittedAt).getTime(), pct: Math.round((s.marks / a.maxMarks) * 100), title: a.title });
  }
  graded.sort((x, y) => x.at - y.at);
  const counted = subs.filter((s) => amap.has(String(s.assignmentId)));
  const avgGrade = graded.length ? Math.round(graded.reduce((a, g) => a + g.pct, 0) / graded.length) : null;

  const present = att.filter((a) => a.status === 'present' || a.status === 'late').length;
  const absent = att.filter((a) => a.status === 'absent').length;
  const attendanceRate = present + absent ? present / (present + absent) : null;

  const bestByQuiz = new Map<string, number>();
  for (const q of attempts) bestByQuiz.set(String(q.quizId), Math.max(bestByQuiz.get(String(q.quizId)) ?? 0, q.percent));
  const passedQuizzes = new Set(attempts.filter((a) => a.passed).map((a) => String(a.quizId)));

  // Weekly streak: any submission, quiz attempt or attended session counts.
  const activity = new Set<string>();
  for (const s of subs) activity.add(weekKey(new Date(s.submittedAt)));
  for (const q of attempts) if (q.submittedAt) activity.add(weekKey(new Date(q.submittedAt)));
  for (const a of att) if ((a.status === 'present' || a.status === 'late') && a.markedAt) activity.add(weekKey(new Date(a.markedAt)));
  const streak = weeklyStreak(activity, new Date(now));

  // On-time run (latest first)
  const ordered = counted
    .map((s) => ({ s, a: amap.get(String(s.assignmentId))! }))
    .sort((x, y) => new Date(y.s.submittedAt).getTime() - new Date(x.s.submittedAt).getTime());
  let onTimeRun = 0;
  for (const { s, a } of ordered) {
    if (new Date(s.submittedAt).getTime() <= new Date(a.dueAt).getTime()) onTimeRun++;
    else break;
  }

  const achievements = computeAchievements({
    submissions: counted.length,
    perfectScores: graded.filter((g) => g.pct >= 100).length,
    onTimeRun,
    attendanceRate,
    sessionsMarked: present + absent,
    bestQuiz: bestByQuiz.size ? Math.max(...bestByQuiz.values()) : null,
    quizzesPassed: passedQuizzes.size,
    bestStreak: streak.best,
    certificates: certs,
  });

  // What to do next
  const next: Recommendation[] = [];
  const submitted = new Set(subs.map((s) => String(s.assignmentId)));
  for (const a of assignments
    .filter((a) => !submitted.has(String(a._id)) && new Date(a.dueAt).getTime() > now - 7 * DAY)
    .sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime())
    .slice(0, 4)) {
    const due = new Date(a.dueAt).getTime();
    const overdue = due < now;
    next.push({
      kind: 'assignment',
      title: a.title,
      detail: overdue ? 'Overdue — submit as soon as you can' : `Due in ${Math.max(1, Math.ceil((due - now) / DAY))} day(s)`,
      href: `/assignments/${String(a._id)}`,
      urgent: overdue || due - now < 2 * DAY,
    });
  }
  const attempted = new Set(attempts.map((a) => String(a.quizId)));
  for (const q of quizzes
    .filter((q) => !attempted.has(String(q._id)) && (!q.closesAt || new Date(q.closesAt).getTime() > now) && (!q.opensAt || new Date(q.opensAt).getTime() <= now))
    .slice(0, 3)) {
    next.push({ kind: 'quiz', title: q.title, detail: q.closesAt ? `Closes ${new Date(q.closesAt).toISOString().slice(0, 10)}` : 'Open now', href: `/quizzes/${String(q._id)}`, urgent: !!q.closesAt && new Date(q.closesAt).getTime() - now < 2 * DAY });
  }
  const recentFeedback = subs
    .filter((s) => s.gradedAt && now - new Date(s.gradedAt).getTime() < 7 * DAY)
    .sort((x, y) => new Date(y.gradedAt!).getTime() - new Date(x.gradedAt!).getTime())
    .slice(0, 2);
  for (const s of recentFeedback) {
    const a = amap.get(String(s.assignmentId));
    if (a) next.push({ kind: 'feedback', title: `Feedback on ${a.title}`, detail: `${s.marks}/${a.maxMarks} — read what your mentor said`, href: `/assignments/${String(s.assignmentId)}`, urgent: false });
  }
  if (attendanceRate !== null && attendanceRate < 0.75 && present + absent >= 3) {
    next.push({ kind: 'attendance', title: 'Your attendance', detail: `${Math.round(attendanceRate * 100)}% — try not to miss the next session`, href: '/attendance', urgent: true });
  }
  next.sort((a, b) => Number(b.urgent) - Number(a.urgent));

  return {
    programs: progs.length,
    submissions: counted.length,
    onTime,
    onTimeRate: counted.length ? onTime / counted.length : null,
    avgGrade,
    gradeTrend: graded.slice(-12).map((g) => ({ label: g.title, pct: g.pct })),
    attendanceRate,
    sessionsMarked: present + absent,
    quizzes: { attempted: attempted.size, passed: passedQuizzes.size, best: bestByQuiz.size ? Math.round(Math.max(...bestByQuiz.values())) : null },
    certificates: certs,
    streak,
    achievements,
    next: next.slice(0, 6),
  };
}
