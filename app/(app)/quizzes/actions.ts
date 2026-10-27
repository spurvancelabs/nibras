// =============================================================================
// FILE: app/(app)/quizzes/actions.ts   (NEW FILE)
// Server actions for quizzes. All permission checks happen in lib/quizzes.ts.
// =============================================================================

'use server';

import { z } from 'zod';
import { reward } from '@/lib/tokens';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import {
  saveQuiz,
  setQuizStatus,
  deleteQuiz,
  duplicateQuiz,
  startAttempt,
  saveAnswers,
  submitAttempt,
  gradeAnswerManually,
  resetAttempt,
  programStudentIds,
} from '@/lib/quizzes';
import { QUESTION_TYPES, QUIZ_RESULT_VISIBILITY } from '@/lib/constants';
import { auditBy } from '@/lib/audit';
import { notify, notifyMany } from '@/lib/notifications';
import { getSettings } from '@/lib/settings';
import { formatDateTime } from '@/lib/time';

const idField = z.string().regex(/^[a-f0-9]{24}$/i);
const optId = z.string().max(24).optional();

const questionSchema = z.object({
  id: optId,
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().max(3000),
  image: z.string().max(500).optional().default(''),
  options: z.array(z.object({ id: optId, text: z.string().max(500), correct: z.boolean() })).max(12),
  acceptedAnswers: z.array(z.string().max(200)).max(20),
  numericAnswer: z.number().finite().nullable(),
  tolerance: z.number().min(0).max(1e9),
  points: z.number().min(0).max(100),
  explanation: z.string().max(2000),
});

const quizSchema = z.object({
  id: optId,
  programId: idField,
  sessionId: z.union([idField, z.literal('')]),
  title: z.string().min(1, 'Give the quiz a title').max(200),
  description: z.string().max(4000),
  timeLimitMin: z.number().int().min(0).max(600),
  maxAttempts: z.number().int().min(0).max(20),
  opensAt: z.string().max(40),
  closesAt: z.string().max(40),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  showResults: z.enum(QUIZ_RESULT_VISIBILITY),
  showCorrectAnswers: z.boolean(),
  passPercent: z.number().int().min(0).max(100),
  questions: z.array(questionSchema).max(200),
});

const answersSchema = z
  .array(
    z.object({
      questionId: z.string().max(24),
      selected: z.array(z.string().max(24)).max(12),
      text: z.string().max(2000),
      number: z.number().finite().nullable(),
    })
  )
  .max(250);

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function featureOn() {
  return (await getSettings()).featureQuizzes !== false;
}

function validDate(v: string) {
  return v === '' || !Number.isNaN(new Date(v).getTime());
}

export async function saveQuizAction(raw: unknown): Promise<R<{ id: string }>> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  if (!(await featureOn())) return { ok: false, error: 'Quizzes are turned off in Settings' };
  const parsed = quizSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid quiz' };
  if (!validDate(parsed.data.opensAt) || !validDate(parsed.data.closesAt)) return { ok: false, error: 'Invalid date' };
  const res = await saveQuiz(user.orgId, user, parsed.data);
  if (!res.ok) return res;
  await auditBy(user, res.created ? 'quiz.create' : 'quiz.update', parsed.data.title, [], {
    quizId: res.id,
    programId: parsed.data.programId,
    questions: parsed.data.questions.length,
  });
  revalidatePath('/quizzes');
  revalidatePath(`/quizzes/${res.id}`);
  return { ok: true, id: res.id };
}

export async function setQuizStatusAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  const parsed = z
    .object({ id: idField, status: z.enum(['draft', 'published', 'closed']), email: z.boolean().optional() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const res = await setQuizStatus(user.orgId, user, parsed.data.id, parsed.data.status);
  if (!res.ok) return res;

  await auditBy(user, 'quiz.update', `${res.quiz.title} → ${parsed.data.status}`, [], { quizId: parsed.data.id });
  if (parsed.data.status === 'published' && res.quiz.wasDraft) {
    const students = await programStudentIds(user.orgId, res.quiz.programId);
    await notifyMany({
      orgId: user.orgId,
      userIds: students,
      type: 'quiz.new',
      title: `New quiz: ${res.quiz.title}`,
      body: 'A new quiz is available. Open it to see the time limit and how many attempts you have.',
      link: `/quizzes/${parsed.data.id}`,
      email: parsed.data.email === true,
      dedupeKeyPrefix: `quiz-new:${parsed.data.id}`,
    });
  }
  revalidatePath('/quizzes');
  revalidatePath(`/quizzes/${parsed.data.id}`);
  return { ok: true };
}

export async function deleteQuizAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  const parsed = z.object({ id: idField }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const res = await deleteQuiz(user.orgId, user, parsed.data.id);
  if (!res.ok) return res;
  await auditBy(user, 'quiz.delete', `${res.title} (${res.attempts} attempts removed)`, [], { quizId: parsed.data.id });
  revalidatePath('/quizzes');
  return { ok: true };
}

export async function duplicateQuizAction(raw: unknown): Promise<R<{ id: string }>> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  const parsed = z.object({ id: idField }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const res = await duplicateQuiz(user.orgId, user, parsed.data.id);
  if (!res.ok) return res;
  await auditBy(user, 'quiz.create', 'Duplicated quiz', [], { quizId: res.id, from: parsed.data.id });
  revalidatePath('/quizzes');
  return { ok: true, id: res.id };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function startAttemptAction(raw: unknown): Promise<R<{ attemptId: string }>> {
  const user = await requireAuth();
  if (!(await featureOn())) return { ok: false, error: 'Quizzes are turned off' };
  const parsed = z.object({ quizId: idField }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  return startAttempt(user.orgId, user, parsed.data.quizId);
}

export async function saveAnswersAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  const parsed = z.object({ attemptId: idField, answers: answersSchema }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid answers' };
  return saveAnswers(user.orgId, user, parsed.data.attemptId, parsed.data.answers);
}

export async function submitAttemptAction(raw: unknown): Promise<R<{ quizId: string; attemptId: string }>> {
  const user = await requireAuth();
  const parsed = z.object({ attemptId: idField, answers: answersSchema.nullable() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid answers' };
  const res = await submitAttempt(user.orgId, user, parsed.data.attemptId, parsed.data.answers);
  if (!res.ok) return res;
  // Token rewards (first pass / perfect score of each quiz; never blocks).
  if (user.role === 'student' && !res.needsReview) {
    if (res.percent >= (res.passPercent ?? 50)) await reward(user.orgId, user.id, 'quizPassed', res.quizId, `Passed “${res.title}”`);
    if (res.percent >= 100) await reward(user.orgId, user.id, 'quizPerfect', res.quizId, `Perfect score on “${res.title}”`);
  }
  revalidatePath(`/quizzes/${res.quizId}`);
  revalidatePath('/quizzes');
  return { ok: true, quizId: res.quizId, attemptId: res.attemptId };
}

// ---------------------------------------------------------------------------
// Staff grading
// ---------------------------------------------------------------------------

export async function gradeAnswerAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  const parsed = z
    .object({ attemptId: idField, questionId: idField, points: z.number().min(0).max(100), feedback: z.string().max(1000) })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const d = parsed.data;
  const res = await gradeAnswerManually(user.orgId, user, d.attemptId, d.questionId, d.points, d.feedback);
  if (!res.ok) return res;
  await auditBy(user, 'quiz.grade', `${res.quizTitle}: ${d.points} pts`, [res.studentId], { attemptId: d.attemptId, questionId: d.questionId });
  if (!res.needsReview) {
    await notify({
      orgId: user.orgId,
      userId: res.studentId,
      type: 'quiz.graded',
      title: `Quiz marked: ${res.quizTitle}`,
      body: `Your result is ready (${res.percent}%).`,
      link: `/quizzes/${res.quizId}/results/${d.attemptId}`,
      dedupeKey: `quiz-graded:${d.attemptId}:${formatDateTime(new Date())}`,
    });
  }
  revalidatePath(`/quizzes/${res.quizId}`);
  revalidatePath(`/quizzes/${res.quizId}/results/${d.attemptId}`);
  return { ok: true };
}

export async function resetAttemptAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };
  const parsed = z.object({ attemptId: idField }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const res = await resetAttempt(user.orgId, user, parsed.data.attemptId);
  if (!res.ok) return res;
  await auditBy(user, 'quiz.attempt_reset', `${res.quizTitle}: attempt removed`, [res.studentId], { attemptId: parsed.data.attemptId });
  revalidatePath(`/quizzes/${res.quizId}`);
  return { ok: true };
}
