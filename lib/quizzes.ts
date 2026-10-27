// =============================================================================
// FILE: lib/quizzes.ts   (NEW FILE — server only)
// Quiz engine: access rules, builder save, attempts, autosave, grading,
// results visibility, manual grading, staff results.
//
// Security rules enforced here (not in the browser):
//   - students only see quizzes of ACTIVE programs they belong to
//   - correct answers are never sent to students before results are allowed
//   - open/close window, time limit (+15 s grace) and attempt limit
//   - answers are checked against the quiz (unknown ids are dropped)
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import Program from '@/models/Program';
import Session from '@/models/Session';
import User from '@/models/User';
import type { Role, QuestionType } from './constants';
import {
  normalizeText,
  quizProblems,
  type QuizInput,
  type QuizEditorData,
  type QuizListItem,
  type PlayerData,
  type PlayerAnswer,
  type PlayerQuestion,
  type ResultData,
  type ResultQuestion,
  type MyQuizState,
} from './quiz-types';

type Viewer = { id: string; role: Role };
type Err = { ok: false; error: string };

const GRACE_MS = 15_000;
const oid = (id: string) => new Types.ObjectId(id);
const isId = (v: unknown): v is string => typeof v === 'string' && Types.ObjectId.isValid(v);

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/** 'manage' (admin / program mentor), 'take' (student in an active program) or null. */
export async function programAccess(orgId: string, user: Viewer, programId: string): Promise<'manage' | 'take' | null> {
  if (!isId(programId)) return null;
  await db();
  if (user.role === 'admin') {
    return (await Program.exists({ _id: programId, orgId })) ? 'manage' : null;
  }
  if (user.role === 'mentor') {
    return (await Program.exists({ _id: programId, orgId, mentors: user.id })) ? 'manage' : null;
  }
  return (await Program.exists({ _id: programId, orgId, students: user.id, status: 'active' })) ? 'take' : null;
}

/** Program ids visible to the user (null = all programs, for admins). */
async function visibleProgramIds(orgId: string, user: Viewer): Promise<string[] | null> {
  if (user.role === 'admin') return null;
  const q: Record<string, unknown> = { orgId };
  if (user.role === 'mentor') q.mentors = user.id;
  else {
    q.students = user.id;
    q.status = 'active';
  }
  const rows = await Program.find(q).select('_id').lean();
  return rows.map((r) => String(r._id));
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function totalPoints(questions: any[]): number {
  return questions.reduce((s, q) => s + (Number(q.points) || 0), 0);
}

function availability(quiz: any, now = new Date()): { open: boolean; reason: string } {
  if (quiz.status !== 'published') return { open: false, reason: quiz.status === 'closed' ? 'Closed' : 'Not published yet' };
  if (quiz.opensAt && new Date(quiz.opensAt) > now) return { open: false, reason: 'Not open yet' };
  if (quiz.closesAt && new Date(quiz.closesAt) <= now) return { open: false, reason: 'Closed' };
  return { open: true, reason: '' };
}

function resultsVisibleToStudent(quiz: any, now = new Date()): boolean {
  if (quiz.showResults === 'immediately') return true;
  if (quiz.showResults === 'after_close') {
    return quiz.status === 'closed' || (!!quiz.closesAt && new Date(quiz.closesAt) <= now);
  }
  return false;
}

function toListItem(q: any, programName: string, sessionTitle: string): QuizListItem {
  return {
    id: String(q._id),
    title: q.title,
    description: q.description ?? '',
    programId: String(q.programId),
    programName,
    sessionId: q.sessionId ? String(q.sessionId) : '',
    sessionTitle,
    status: q.status,
    questionCount: (q.questions ?? []).length,
    totalPoints: totalPoints(q.questions ?? []),
    timeLimitMin: q.timeLimitMin ?? 0,
    maxAttempts: q.maxAttempts ?? 1,
    opensAt: q.opensAt ? new Date(q.opensAt).toISOString() : null,
    closesAt: q.closesAt ? new Date(q.closesAt).toISOString() : null,
    passPercent: q.passPercent ?? 50,
    showResults: q.showResults ?? 'immediately',
    createdAt: new Date(q.createdAt).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listQuizzes(
  orgId: string,
  user: Viewer,
  opts: { programId?: string; sessionId?: string } = {}
): Promise<QuizListItem[]> {
  await db();
  const programIds = await visibleProgramIds(orgId, user);
  if (programIds && programIds.length === 0) return [];

  const q: Record<string, unknown> = { orgId: oid(orgId) };
  if (programIds) q.programId = { $in: programIds.map(oid) };
  if (isId(opts.programId)) {
    if (programIds && !programIds.includes(opts.programId)) return [];
    q.programId = oid(opts.programId);
  }
  if (isId(opts.sessionId)) q.sessionId = oid(opts.sessionId);
  if (user.role === 'student') q.status = { $in: ['published', 'closed'] };

  const quizzes = (await Quiz.find(q).sort({ createdAt: -1 }).limit(300).lean()) as any[];
  if (!quizzes.length) return [];

  const [programs, sessions] = await Promise.all([
    Program.find({ _id: { $in: quizzes.map((x) => x.programId) } }).select('name').lean(),
    Session.find({ _id: { $in: quizzes.map((x) => x.sessionId).filter(Boolean) } }).select('title').lean(),
  ]);
  const pName = new Map(programs.map((p: any) => [String(p._id), p.name as string]));
  const sTitle = new Map(sessions.map((s: any) => [String(s._id), s.title as string]));
  const items = quizzes.map((x) => toListItem(x, pName.get(String(x.programId)) ?? 'Program', x.sessionId ? sTitle.get(String(x.sessionId)) ?? '' : ''));

  if (user.role === 'student') {
    const attempts = (await QuizAttempt.find({ studentId: user.id, quizId: { $in: quizzes.map((x) => x._id) } })
      .select('quizId status percent attemptNo deadlineAt')
      .lean()) as any[];
    const now = new Date();
    for (const item of items) {
      const quiz = quizzes.find((x) => String(x._id) === item.id);
      const mine = attempts.filter((a) => String(a.quizId) === item.id);
      item.my = myState(quiz, mine, now);
    }
  } else {
    const stats = (await QuizAttempt.aggregate([
      { $match: { quizId: { $in: quizzes.map((x) => x._id) }, status: 'submitted' } },
      { $group: { _id: '$quizId', n: { $sum: 1 }, avg: { $avg: '$percent' } } },
    ])) as { _id: unknown; n: number; avg: number }[];
    const m = new Map(stats.map((s) => [String(s._id), s]));
    for (const item of items) {
      const s = m.get(item.id);
      item.attemptCount = s?.n ?? 0;
      item.avgPercent = s ? Math.round(s.avg) : null;
    }
  }
  return items;
}

function myState(quiz: any, mine: any[], now: Date): MyQuizState {
  const submitted = mine.filter((a) => a.status === 'submitted');
  const inProgress = mine.find((a) => a.status === 'in_progress') ?? null;
  const showScore = resultsVisibleToStudent(quiz, now);
  const best = submitted.length && showScore ? Math.max(...submitted.map((a) => a.percent ?? 0)) : null;
  const last = [...mine].sort((a, b) => b.attemptNo - a.attemptNo)[0];
  const av = availability(quiz, now);
  const limit = quiz.maxAttempts ?? 1;
  let canStart = av.open;
  let reason = av.reason;
  if (inProgress) {
    canStart = true;
    reason = '';
  } else if (canStart && limit > 0 && submitted.length >= limit) {
    canStart = false;
    reason = 'No attempts left';
  }
  return {
    attempts: submitted.length,
    bestPercent: best,
    inProgressId: inProgress ? String(inProgress._id) : null,
    lastAttemptId: last ? String(last._id) : null,
    canStart,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export async function getQuizForEditor(orgId: string, user: Viewer, quizId: string): Promise<QuizEditorData | null> {
  if (!isId(quizId)) return null;
  await db();
  const q = (await Quiz.findOne({ _id: quizId, orgId }).lean()) as any;
  if (!q) return null;
  if ((await programAccess(orgId, user, String(q.programId))) !== 'manage') return null;
  const attemptCount = await QuizAttempt.countDocuments({ quizId: q._id });
  return {
    id: String(q._id),
    status: q.status,
    attemptCount,
    programId: String(q.programId),
    sessionId: q.sessionId ? String(q.sessionId) : '',
    title: q.title,
    description: q.description ?? '',
    timeLimitMin: q.timeLimitMin ?? 0,
    maxAttempts: q.maxAttempts ?? 1,
    opensAt: q.opensAt ? new Date(q.opensAt).toISOString() : '',
    closesAt: q.closesAt ? new Date(q.closesAt).toISOString() : '',
    shuffleQuestions: !!q.shuffleQuestions,
    shuffleOptions: !!q.shuffleOptions,
    showResults: q.showResults ?? 'immediately',
    showCorrectAnswers: q.showCorrectAnswers !== false,
    passPercent: q.passPercent ?? 50,
    questions: (q.questions ?? []).map((qq: any) => ({
      id: String(qq._id),
      type: qq.type,
      prompt: qq.prompt,
      image: qq.image ?? '',
      options: (qq.options ?? []).map((o: any) => ({
        id: String(o._id),
        text: o.text,
        correct: (qq.correct ?? []).some((c: any) => String(c) === String(o._id)),
      })),
      acceptedAnswers: qq.acceptedAnswers ?? [],
      numericAnswer: qq.numericAnswer ?? null,
      tolerance: qq.tolerance ?? 0,
      points: qq.points ?? 1,
      explanation: qq.explanation ?? '',
    })),
  };
}

/** Builder input → stored questions. Existing ids are kept so attempts stay valid. */
function toStoredQuestions(input: QuizInput['questions']) {
  return input.map((q) => {
    const qid = isId(q.id) ? oid(q.id) : new Types.ObjectId();
    const isChoice = q.type === 'single' || q.type === 'multiple' || q.type === 'true_false';
    const options = isChoice
      ? q.options
          .filter((o) => o.text.trim())
          .slice(0, 12)
          .map((o) => ({ _id: isId(o.id) ? oid(o.id) : new Types.ObjectId(), text: o.text.trim().slice(0, 500), correct: o.correct }))
      : [];
    return {
      _id: qid,
      type: q.type,
      prompt: q.prompt.trim().slice(0, 3000),
      image: /^https?:\/\//i.test(q.image ?? '') ? q.image.slice(0, 500) : '',
      options: options.map(({ _id, text }) => ({ _id, text })),
      correct: options.filter((o) => o.correct).map((o) => o._id),
      acceptedAnswers: q.type === 'short' ? q.acceptedAnswers.map((a) => a.trim()).filter(Boolean).slice(0, 20) : [],
      numericAnswer: q.type === 'numeric' && q.numericAnswer !== null && Number.isFinite(q.numericAnswer) ? q.numericAnswer : null,
      tolerance: q.type === 'numeric' ? Math.max(0, Number(q.tolerance) || 0) : 0,
      points: Math.min(100, Math.max(0, Number(q.points) || 0)),
      explanation: (q.explanation ?? '').slice(0, 2000),
    };
  });
}

export async function saveQuiz(
  orgId: string,
  user: Viewer,
  input: QuizInput
): Promise<{ ok: true; id: string; created: boolean } | Err> {
  await db();
  if ((await programAccess(orgId, user, input.programId)) !== 'manage') return { ok: false, error: 'You can only make quizzes for your own programs' };
  if (input.sessionId) {
    if (!isId(input.sessionId) || !(await Session.exists({ _id: input.sessionId, orgId, programId: input.programId }))) {
      return { ok: false, error: 'That session is not part of this program' };
    }
  }
  if (input.questions.length > 200) return { ok: false, error: 'A quiz can have at most 200 questions' };

  const doc = {
    programId: oid(input.programId),
    sessionId: input.sessionId ? oid(input.sessionId) : null,
    title: input.title.trim().slice(0, 200),
    description: input.description.slice(0, 4000),
    questions: toStoredQuestions(input.questions),
    timeLimitMin: Math.min(600, Math.max(0, Math.round(input.timeLimitMin) || 0)),
    maxAttempts: Math.min(20, Math.max(0, Math.round(input.maxAttempts) || 0)),
    opensAt: input.opensAt ? new Date(input.opensAt) : null,
    closesAt: input.closesAt ? new Date(input.closesAt) : null,
    shuffleQuestions: !!input.shuffleQuestions,
    shuffleOptions: !!input.shuffleOptions,
    showResults: input.showResults,
    showCorrectAnswers: !!input.showCorrectAnswers,
    passPercent: Math.min(100, Math.max(0, Math.round(input.passPercent) || 0)),
  };
  if (!doc.title) return { ok: false, error: 'Give the quiz a title' };

  if (input.id) {
    if (!isId(input.id)) return { ok: false, error: 'Quiz not found' };
    const existing = (await Quiz.findOne({ _id: input.id, orgId }).select('programId status').lean()) as any;
    if (!existing) return { ok: false, error: 'Quiz not found' };
    if ((await programAccess(orgId, user, String(existing.programId))) !== 'manage') return { ok: false, error: 'Not allowed' };
    if (existing.status !== 'draft') {
      const problems = quizProblems(input);
      if (problems.length) return { ok: false, error: problems[0] };
    }
    await Quiz.updateOne({ _id: input.id, orgId }, { $set: doc });
    return { ok: true, id: input.id, created: false };
  }
  const created = await Quiz.create({ ...doc, orgId: oid(orgId), status: 'draft', createdBy: oid(user.id) });
  return { ok: true, id: String(created._id), created: true };
}

export async function setQuizStatus(
  orgId: string,
  user: Viewer,
  quizId: string,
  status: 'draft' | 'published' | 'closed'
): Promise<{ ok: true; quiz: { title: string; programId: string; wasDraft: boolean } } | Err> {
  const data = await getQuizForEditor(orgId, user, quizId);
  if (!data) return { ok: false, error: 'Quiz not found' };
  if (status === 'published') {
    const problems = quizProblems(data);
    if (problems.length) return { ok: false, error: problems[0] };
  }
  if (status === 'draft' && data.attemptCount > 0) {
    return { ok: false, error: 'Students have already attempted this quiz — close it instead of unpublishing.' };
  }
  const set: Record<string, unknown> = { status };
  if (status === 'published' && data.status === 'draft') set.publishedAt = new Date();
  await Quiz.updateOne({ _id: quizId, orgId }, { $set: set });
  return { ok: true, quiz: { title: data.title, programId: data.programId, wasDraft: data.status === 'draft' } };
}

export async function deleteQuiz(orgId: string, user: Viewer, quizId: string): Promise<{ ok: true; title: string; attempts: number } | Err> {
  const data = await getQuizForEditor(orgId, user, quizId);
  if (!data) return { ok: false, error: 'Quiz not found' };
  const del = await QuizAttempt.deleteMany({ quizId: oid(quizId), orgId: oid(orgId) });
  await Quiz.deleteOne({ _id: quizId, orgId });
  return { ok: true, title: data.title, attempts: del.deletedCount ?? 0 };
}

export async function duplicateQuiz(orgId: string, user: Viewer, quizId: string): Promise<{ ok: true; id: string } | Err> {
  const data = await getQuizForEditor(orgId, user, quizId);
  if (!data) return { ok: false, error: 'Quiz not found' };
  const copy: QuizInput = {
    ...data,
    id: undefined,
    title: `${data.title} (copy)`.slice(0, 200),
    questions: data.questions.map((q) => ({ ...q, id: undefined, options: q.options.map((o) => ({ ...o, id: undefined })) })),
  };
  const res = await saveQuiz(orgId, user, copy);
  return res.ok ? { ok: true, id: res.id } : res;
}

// ---------------------------------------------------------------------------
// Overview (both roles)
// ---------------------------------------------------------------------------

export async function getQuizOverview(orgId: string, user: Viewer, quizId: string) {
  if (!isId(quizId)) return null;
  await db();
  const q = (await Quiz.findOne({ _id: quizId, orgId }).lean()) as any;
  if (!q) return null;
  const access = await programAccess(orgId, user, String(q.programId));
  if (!access) return null;
  if (access === 'take' && q.status === 'draft') return null;
  const [program, session] = await Promise.all([
    Program.findById(q.programId).select('name').lean() as Promise<any>,
    q.sessionId ? (Session.findById(q.sessionId).select('title').lean() as Promise<any>) : Promise.resolve(null),
  ]);
  const item = toListItem(q, program?.name ?? 'Program', session?.title ?? '');
  if (access === 'take') {
    const mine = (await QuizAttempt.find({ quizId: q._id, studentId: user.id }).sort({ attemptNo: -1 }).lean()) as any[];
    // finish any attempt whose time ran out
    for (const a of mine) if (a.status === 'in_progress') await finalizeIfExpired(a, q);
    const fresh = (await QuizAttempt.find({ quizId: q._id, studentId: user.id }).sort({ attemptNo: -1 }).lean()) as any[];
    item.my = myState(q, fresh, new Date());
    const visible = resultsVisibleToStudent(q);
    return {
      access,
      quiz: item,
      attempts: fresh.map((a) => ({
        id: String(a._id),
        attemptNo: a.attemptNo,
        status: a.status as 'in_progress' | 'submitted',
        submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
        percent: visible ? a.percent : null,
        passed: visible ? a.passed : null,
        needsReview: !!a.needsReview,
      })),
    };
  }
  return { access, quiz: item, attempts: [] as never[] };
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function startAttempt(orgId: string, user: Viewer, quizId: string): Promise<{ ok: true; attemptId: string } | Err> {
  if (user.role !== 'student') return { ok: false, error: 'Only students take quizzes. Use Preview to try it.' };
  if (!isId(quizId)) return { ok: false, error: 'Quiz not found' };
  await db();
  const q = (await Quiz.findOne({ _id: quizId, orgId }).lean()) as any;
  if (!q) return { ok: false, error: 'Quiz not found' };
  if ((await programAccess(orgId, user, String(q.programId))) !== 'take') return { ok: false, error: 'You are not enrolled in this program' };

  const existing = (await QuizAttempt.find({ quizId: q._id, studentId: user.id }).lean()) as any[];
  const inProgress = existing.find((a) => a.status === 'in_progress');
  if (inProgress) {
    const done = await finalizeIfExpired(inProgress, q);
    if (!done) return { ok: true, attemptId: String(inProgress._id) };
  }

  const av = availability(q);
  if (!av.open) return { ok: false, error: av.reason };
  const submitted = await QuizAttempt.countDocuments({ quizId: q._id, studentId: user.id, status: 'submitted' });
  if ((q.maxAttempts ?? 1) > 0 && submitted >= q.maxAttempts) return { ok: false, error: 'No attempts left' };

  const now = new Date();
  let deadline: Date | null = q.timeLimitMin > 0 ? new Date(now.getTime() + q.timeLimitMin * 60000) : null;
  if (q.closesAt && (!deadline || new Date(q.closesAt) < deadline)) deadline = new Date(q.closesAt);

  const qs = q.questions as any[];
  const order = (q.shuffleQuestions ? shuffled(qs) : qs).map((x) => x._id);
  const optionOrder = qs.map((x) => ({
    q: x._id,
    o: (q.shuffleOptions && x.type !== 'true_false' ? shuffled(x.options ?? []) : x.options ?? []).map((o: any) => o._id),
  }));

  const maxNo = existing.reduce((m, a) => Math.max(m, a.attemptNo), 0);
  for (let i = 0; i < 3; i++) {
    try {
      const created = await QuizAttempt.create({
        orgId: oid(orgId),
        quizId: q._id,
        programId: q.programId,
        studentId: oid(user.id),
        attemptNo: maxNo + 1 + i,
        status: 'in_progress',
        startedAt: now,
        deadlineAt: deadline,
        questionOrder: order,
        optionOrder,
        answers: [],
        maxScore: totalPoints(qs),
      });
      return { ok: true, attemptId: String(created._id) };
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      // a double click created one at the same moment — use that one
      const again = (await QuizAttempt.findOne({ quizId: q._id, studentId: user.id, status: 'in_progress' }).lean()) as any;
      if (again) return { ok: true, attemptId: String(again._id) };
    }
  }
  return { ok: false, error: 'Could not start the quiz — please try again.' };
}

function cleanAnswers(quiz: any, raw: PlayerAnswer[]): any[] {
  const byId = new Map((quiz.questions as any[]).map((q) => [String(q._id), q]));
  const out: any[] = [];
  const seen = new Set<string>();
  for (const a of raw.slice(0, 250)) {
    const q = byId.get(a.questionId);
    if (!q || seen.has(a.questionId)) continue;
    seen.add(a.questionId);
    const optionIds = new Set((q.options ?? []).map((o: any) => String(o._id)));
    const type = q.type as QuestionType;
    let selected = (a.selected ?? []).filter((id) => optionIds.has(id));
    if (type === 'single' || type === 'true_false') selected = selected.slice(0, 1);
    out.push({
      questionId: q._id,
      selected: Array.from(new Set(selected)).map(oid),
      text: type === 'short' ? String(a.text ?? '').slice(0, 2000) : '',
      number: type === 'numeric' && a.number !== null && Number.isFinite(Number(a.number)) ? Number(a.number) : null,
    });
  }
  return out;
}

/** Score answers against the quiz. Short answers without accepted answers need a person. */
export function gradeAnswers(quiz: any, answers: any[]) {
  const manual = new Map(answers.filter((a) => a.manual === true).map((a) => [String(a.questionId), a]));
  let score = 0;
  let needsReview = false;
  const graded = (quiz.questions as any[]).map((q) => {
    const a = answers.find((x) => String(x.questionId) === String(q._id)) ?? { questionId: q._id, selected: [], text: '', number: null };
    const pts = Number(q.points) || 0;
    let awarded: number | null = 0;
    let correct: boolean | null = false;
    const correctIds = (q.correct ?? []).map(String);
    const sel = (a.selected ?? []).map(String);

    if (q.type === 'single' || q.type === 'true_false') {
      correct = sel.length === 1 && correctIds.includes(sel[0]);
      awarded = correct ? pts : 0;
    } else if (q.type === 'multiple') {
      const right = sel.filter((s: string) => correctIds.includes(s)).length;
      const wrong = sel.filter((s: string) => !correctIds.includes(s)).length;
      const frac = correctIds.length ? Math.max(0, (right - wrong) / correctIds.length) : 0;
      awarded = Math.round(pts * frac * 100) / 100;
      correct = frac === 1;
    } else if (q.type === 'numeric') {
      const n = a.number;
      correct = n !== null && n !== undefined && q.numericAnswer !== null && Math.abs(Number(n) - Number(q.numericAnswer)) <= (Number(q.tolerance) || 0);
      awarded = correct ? pts : 0;
    } else if (q.type === 'short') {
      const given = normalizeText(a.text ?? '');
      const accepted = (q.acceptedAnswers ?? []).map(normalizeText).filter(Boolean);
      if (!given) {
        awarded = 0;
        correct = false;
      } else if (accepted.includes(given)) {
        awarded = pts;
        correct = true;
      } else if (accepted.length === 0) {
        awarded = null; // a mentor decides
        correct = null;
      } else {
        awarded = 0;
        correct = false;
      }
    }
    const m = manual.get(String(q._id));
    let feedback = '';
    let isManual = false;
    if (m) {
      awarded = Math.min(pts, Math.max(0, Number(m.awarded) || 0));
      correct = awarded >= pts;
      feedback = m.feedback ?? '';
      isManual = true;
    }
    if (awarded === null) needsReview = true;
    else score += awarded;
    return {
      questionId: a.questionId,
      selected: a.selected ?? [],
      text: a.text ?? '',
      number: a.number ?? null,
      awarded,
      correct,
      feedback,
      manual: isManual,
    };
  });
  const maxScore = totalPoints(quiz.questions);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return { answers: graded, score: Math.round(score * 100) / 100, maxScore, percent, passed: !needsReview && percent >= (quiz.passPercent ?? 50), needsReview };
}

/** Grades and closes an in-progress attempt whose time has run out. Returns true if it did. */
async function finalizeIfExpired(attempt: any, quiz: any): Promise<boolean> {
  if (attempt.status !== 'in_progress' || !attempt.deadlineAt) return false;
  if (Date.now() <= new Date(attempt.deadlineAt).getTime() + GRACE_MS) return false;
  const g = gradeAnswers(quiz, attempt.answers ?? []);
  await QuizAttempt.updateOne(
    { _id: attempt._id, status: 'in_progress' },
    { $set: { ...g, status: 'submitted', submittedAt: new Date(attempt.deadlineAt), autoSubmitted: true } }
  );
  return true;
}

async function loadOwnAttempt(orgId: string, user: Viewer, attemptId: string) {
  if (!isId(attemptId)) return null;
  await db();
  const attempt = (await QuizAttempt.findOne({ _id: attemptId, orgId, studentId: user.id }).lean()) as any;
  if (!attempt) return null;
  const quiz = (await Quiz.findOne({ _id: attempt.quizId, orgId }).lean()) as any;
  if (!quiz) return null;
  return { attempt, quiz };
}

function playerQuestions(quiz: any, attempt: any): PlayerQuestion[] {
  const byId = new Map((quiz.questions as any[]).map((q) => [String(q._id), q]));
  const optOrder = new Map((attempt.optionOrder ?? []).map((x: any) => [String(x.q), (x.o ?? []).map(String)]));
  const order: string[] = (attempt.questionOrder ?? []).map(String);
  // questions added after the attempt started go at the end
  for (const q of quiz.questions as any[]) if (!order.includes(String(q._id))) order.push(String(q._id));
  return order
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q: any) => {
      const wanted = (optOrder.get(String(q._id)) as string[] | undefined) ?? [];
      const opts = (q.options ?? []).map((o: any) => ({ id: String(o._id), text: o.text as string }));
      opts.sort((a: { id: string }, b: { id: string }) => {
        const ia = wanted.indexOf(a.id);
        const ib = wanted.indexOf(b.id);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      return { id: String(q._id), type: q.type, prompt: q.prompt, image: q.image ?? '', points: q.points ?? 1, options: opts };
    });
}

function toPlayerAnswers(answers: any[]): PlayerAnswer[] {
  return (answers ?? []).map((a) => ({
    questionId: String(a.questionId),
    selected: (a.selected ?? []).map(String),
    text: a.text ?? '',
    number: a.number ?? null,
  }));
}

export async function getPlayer(orgId: string, user: Viewer, attemptId: string): Promise<PlayerData | { redirectTo: string } | null> {
  const loaded = await loadOwnAttempt(orgId, user, attemptId);
  if (!loaded) return null;
  const { attempt, quiz } = loaded;
  if (attempt.status !== 'in_progress' || (await finalizeIfExpired(attempt, quiz))) {
    return { redirectTo: `/quizzes/${quiz._id}/results/${attempt._id}` };
  }
  return {
    attemptId: String(attempt._id),
    quizId: String(quiz._id),
    title: quiz.title,
    description: quiz.description ?? '',
    attemptNo: attempt.attemptNo,
    maxAttempts: quiz.maxAttempts ?? 1,
    deadlineAt: attempt.deadlineAt ? new Date(attempt.deadlineAt).toISOString() : null,
    serverNow: new Date().toISOString(),
    questions: playerQuestions(quiz, attempt),
    answers: toPlayerAnswers(attempt.answers),
  };
}

export async function saveAnswers(orgId: string, user: Viewer, attemptId: string, raw: PlayerAnswer[]): Promise<{ ok: true } | Err> {
  const loaded = await loadOwnAttempt(orgId, user, attemptId);
  if (!loaded) return { ok: false, error: 'Attempt not found' };
  const { attempt, quiz } = loaded;
  if (attempt.status !== 'in_progress') return { ok: false, error: 'This attempt was already submitted' };
  if (attempt.deadlineAt && Date.now() > new Date(attempt.deadlineAt).getTime() + GRACE_MS) {
    await finalizeIfExpired(attempt, quiz);
    return { ok: false, error: 'Time is up — your saved answers were submitted.' };
  }
  await QuizAttempt.updateOne({ _id: attempt._id, status: 'in_progress' }, { $set: { answers: cleanAnswers(quiz, raw) } });
  return { ok: true };
}

export async function submitAttempt(
  orgId: string,
  user: Viewer,
  attemptId: string,
  raw: PlayerAnswer[] | null
): Promise<{ ok: true; quizId: string; attemptId: string; percent: number; needsReview: boolean; title: string; programId: string; passPercent?: number } | Err> {
  const loaded = await loadOwnAttempt(orgId, user, attemptId);
  if (!loaded) return { ok: false, error: 'Attempt not found' };
  const { attempt, quiz } = loaded;
  const base = { quizId: String(quiz._id), attemptId: String(attempt._id), title: quiz.title, programId: String(quiz.programId), passPercent: quiz.passPercent ?? 50 };
  if (attempt.status !== 'in_progress') return { ok: true, ...base, percent: attempt.percent, needsReview: attempt.needsReview };

  const late = attempt.deadlineAt && Date.now() > new Date(attempt.deadlineAt).getTime() + GRACE_MS;
  // After the deadline only the answers saved in time count.
  const answers = raw && !late ? cleanAnswers(quiz, raw) : attempt.answers ?? [];
  const g = gradeAnswers(quiz, answers);
  const res = await QuizAttempt.updateOne(
    { _id: attempt._id, status: 'in_progress' },
    {
      $set: {
        ...g,
        status: 'submitted',
        submittedAt: late ? new Date(attempt.deadlineAt) : new Date(),
        autoSubmitted: !!late,
      },
    }
  );
  if (res.modifiedCount === 0) {
    const now = (await QuizAttempt.findById(attempt._id).select('percent needsReview').lean()) as any;
    return { ok: true, ...base, percent: now?.percent ?? 0, needsReview: !!now?.needsReview };
  }
  return { ok: true, ...base, percent: g.percent, needsReview: g.needsReview };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function getResult(orgId: string, user: Viewer, attemptId: string): Promise<ResultData | null> {
  if (!isId(attemptId)) return null;
  await db();
  const attempt = (await QuizAttempt.findOne({ _id: attemptId, orgId }).lean()) as any;
  if (!attempt) return null;
  const quiz = (await Quiz.findOne({ _id: attempt.quizId, orgId }).lean()) as any;
  if (!quiz) return null;

  const isOwner = String(attempt.studentId) === user.id;
  const staff = (await programAccess(orgId, user, String(quiz.programId))) === 'manage';
  if (!isOwner && !staff) return null;
  if (attempt.status === 'in_progress' && isOwner) await finalizeIfExpired(attempt, quiz);

  const fresh = (await QuizAttempt.findById(attempt._id).lean()) as any;
  const student = (await User.findById(fresh.studentId).select('name').lean()) as any;
  const scoreVisible = staff || resultsVisibleToStudent(quiz);
  const detailVisible = staff || (scoreVisible && quiz.showCorrectAnswers !== false);
  const answers = toPlayerAnswers(fresh.answers);
  const graded = new Map((fresh.answers ?? []).map((a: any) => [String(a.questionId), a]));

  const questions: ResultQuestion[] = playerQuestions(quiz, fresh).map((pq) => {
    const q = (quiz.questions as any[]).find((x) => String(x._id) === pq.id);
    const g = graded.get(pq.id) as any;
    const base: ResultQuestion = {
      ...pq,
      answer: answers.find((a) => a.questionId === pq.id) ?? null,
      awarded: scoreVisible ? g?.awarded ?? (fresh.status === 'submitted' ? 0 : null) : null,
      correct: scoreVisible ? g?.correct ?? null : null,
      feedback: scoreVisible ? g?.feedback ?? '' : '',
    };
    if (detailVisible && q) {
      base.correctOptionIds = (q.correct ?? []).map(String);
      base.acceptedAnswers = q.acceptedAnswers ?? [];
      base.numericAnswer = q.numericAnswer ?? null;
      base.tolerance = q.tolerance ?? 0;
      base.explanation = q.explanation ?? '';
    }
    return base;
  });

  return {
    attemptId: String(fresh._id),
    quizId: String(quiz._id),
    quizTitle: quiz.title,
    studentId: String(fresh.studentId),
    studentName: student?.name ?? 'Student',
    attemptNo: fresh.attemptNo,
    submittedAt: fresh.submittedAt ? new Date(fresh.submittedAt).toISOString() : null,
    startedAt: new Date(fresh.startedAt).toISOString(),
    autoSubmitted: !!fresh.autoSubmitted,
    scoreVisible,
    detailVisible,
    score: scoreVisible ? fresh.score : 0,
    maxScore: fresh.maxScore,
    percent: scoreVisible ? fresh.percent : 0,
    passed: scoreVisible ? !!fresh.passed : false,
    passPercent: quiz.passPercent ?? 50,
    needsReview: !!fresh.needsReview,
    questions,
  };
}

/** Staff: set points for one answer by hand (short answers, or overrides). */
export async function gradeAnswerManually(
  orgId: string,
  user: Viewer,
  attemptId: string,
  questionId: string,
  points: number,
  feedback: string
): Promise<{ ok: true; studentId: string; quizId: string; quizTitle: string; percent: number; needsReview: boolean } | Err> {
  if (!isId(attemptId) || !isId(questionId)) return { ok: false, error: 'Not found' };
  await db();
  const attempt = (await QuizAttempt.findOne({ _id: attemptId, orgId }).lean()) as any;
  if (!attempt || attempt.status !== 'submitted') return { ok: false, error: 'Only submitted attempts can be graded' };
  const quiz = (await Quiz.findOne({ _id: attempt.quizId, orgId }).lean()) as any;
  if (!quiz) return { ok: false, error: 'Quiz not found' };
  if ((await programAccess(orgId, user, String(quiz.programId))) !== 'manage') return { ok: false, error: 'Not allowed' };
  const q = (quiz.questions as any[]).find((x) => String(x._id) === questionId);
  if (!q) return { ok: false, error: 'Question not found' };

  const answers = (attempt.answers ?? []).map((a: any) => ({ ...a }));
  const idx = answers.findIndex((a: any) => String(a.questionId) === questionId);
  const base = idx >= 0 ? answers[idx] : { questionId: q._id, selected: [], text: '', number: null };
  const entry = { ...base, awarded: Math.min(q.points ?? 1, Math.max(0, points)), feedback: feedback.slice(0, 1000), manual: true };
  if (idx >= 0) answers[idx] = entry;
  else answers.push(entry);
  const g = gradeAnswers(quiz, answers);
  await QuizAttempt.updateOne({ _id: attempt._id }, { $set: { answers: g.answers, score: g.score, percent: g.percent, passed: g.passed, needsReview: g.needsReview } });
  return { ok: true, studentId: String(attempt.studentId), quizId: String(quiz._id), quizTitle: quiz.title, percent: g.percent, needsReview: g.needsReview };
}

export async function resetAttempt(orgId: string, user: Viewer, attemptId: string): Promise<{ ok: true; studentId: string; quizId: string; quizTitle: string } | Err> {
  if (!isId(attemptId)) return { ok: false, error: 'Not found' };
  await db();
  const attempt = (await QuizAttempt.findOne({ _id: attemptId, orgId }).lean()) as any;
  if (!attempt) return { ok: false, error: 'Attempt not found' };
  const quiz = (await Quiz.findOne({ _id: attempt.quizId, orgId }).select('programId title').lean()) as any;
  if (!quiz || (await programAccess(orgId, user, String(quiz.programId))) !== 'manage') return { ok: false, error: 'Not allowed' };
  await QuizAttempt.deleteOne({ _id: attempt._id });
  return { ok: true, studentId: String(attempt.studentId), quizId: String(quiz._id), quizTitle: quiz.title };
}

export type QuizResultsRow = {
  studentId: string;
  name: string;
  email: string;
  memberId: string;
  attempts: number;
  bestPercent: number | null;
  lastAttemptId: string | null;
  bestAttemptId: string | null;
  inProgress: boolean;
  passed: boolean;
  needsReview: boolean;
  lastSubmittedAt: string | null;
};

export async function getQuizResults(orgId: string, user: Viewer, quizId: string) {
  if (!isId(quizId)) return null;
  await db();
  const quiz = (await Quiz.findOne({ _id: quizId, orgId }).lean()) as any;
  if (!quiz || (await programAccess(orgId, user, String(quiz.programId))) !== 'manage') return null;
  const program = (await Program.findById(quiz.programId).select('students').lean()) as any;
  const students = (await User.find({ _id: { $in: program?.students ?? [] }, orgId })
    .select('name email memberId')
    .sort({ name: 1 })
    .lean()) as any[];
  const attempts = (await QuizAttempt.find({ quizId: quiz._id }).lean()) as any[];

  const rows: QuizResultsRow[] = students.map((s) => {
    const mine = attempts.filter((a) => String(a.studentId) === String(s._id));
    const sub = mine.filter((a) => a.status === 'submitted');
    const best = sub.reduce((b: any, a: any) => (!b || a.percent > b.percent ? a : b), null);
    const last = [...mine].sort((a, b) => b.attemptNo - a.attemptNo)[0];
    return {
      studentId: String(s._id),
      name: s.name,
      email: s.email,
      memberId: s.memberId ?? '',
      attempts: sub.length,
      bestPercent: best ? best.percent : null,
      bestAttemptId: best ? String(best._id) : null,
      lastAttemptId: last ? String(last._id) : null,
      inProgress: mine.some((a) => a.status === 'in_progress'),
      passed: !!best?.passed,
      needsReview: sub.some((a) => a.needsReview),
      lastSubmittedAt: sub.length ? new Date(Math.max(...sub.map((a) => +new Date(a.submittedAt)))).toISOString() : null,
    };
  });

  const submitted = attempts.filter((a) => a.status === 'submitted');
  const perQuestion = (quiz.questions as any[]).map((q, i) => {
    const answered = submitted.map((a) => (a.answers ?? []).find((x: any) => String(x.questionId) === String(q._id))).filter(Boolean);
    const right = answered.filter((x: any) => x.correct === true).length;
    return { index: i + 1, id: String(q._id), prompt: q.prompt as string, type: q.type as QuestionType, correctRate: answered.length ? Math.round((right / answered.length) * 100) : null };
  });
  const best = rows.filter((r) => r.bestPercent !== null);
  return {
    quiz: toListItem(quiz, '', ''),
    rows,
    stats: {
      students: rows.length,
      attempted: best.length,
      avgPercent: best.length ? Math.round(best.reduce((s, r) => s + (r.bestPercent ?? 0), 0) / best.length) : null,
      passRate: best.length ? Math.round((best.filter((r) => r.passed).length / best.length) * 100) : null,
      needsReview: rows.filter((r) => r.needsReview).length,
    },
    perQuestion,
  };
}

/** Best quiz percentage per (quiz, student) for a program — used by gradebook & certificates. */
export async function bestQuizScores(orgId: string, programId: string) {
  await db();
  const quizzes = (await Quiz.find({ orgId, programId, status: { $in: ['published', 'closed'] } })
    .select('title passPercent')
    .sort({ createdAt: 1 })
    .lean()) as any[];
  const rows = (await QuizAttempt.aggregate([
    { $match: { orgId: oid(orgId), programId: oid(programId), status: 'submitted' } },
    { $group: { _id: { q: '$quizId', s: '$studentId' }, best: { $max: '$percent' } } },
  ])) as { _id: { q: unknown; s: unknown }; best: number }[];
  const best = new Map(rows.map((r) => [`${String(r._id.q)}:${String(r._id.s)}`, r.best]));
  return {
    quizzes: quizzes.map((q) => ({ id: String(q._id), title: q.title as string, passPercent: q.passPercent ?? 50 })),
    best,
  };
}

/** Programs this user can build quizzes for, with their sessions (builder dropdowns). */
export async function listManageablePrograms(orgId: string, user: Viewer) {
  await db();
  const q: Record<string, unknown> = { orgId };
  if (user.role === 'mentor') q.mentors = user.id;
  else if (user.role !== 'admin') return [];
  const programs = (await Program.find(q).select('name status').sort({ createdAt: -1 }).lean()) as any[];
  const sessions = (await Session.find({ orgId, programId: { $in: programs.map((p) => p._id) } })
    .select('title programId startsAt')
    .sort({ startsAt: 1 })
    .lean()) as any[];
  return programs.map((p) => ({
    id: String(p._id),
    name: p.name as string,
    status: p.status as string,
    sessions: sessions
      .filter((s) => String(s.programId) === String(p._id))
      .map((s) => ({ id: String(s._id), title: s.title as string, startsAt: new Date(s.startsAt).toISOString() })),
  }));
}

/** Student ids of a program (for notifications). */
export async function programStudentIds(orgId: string, programId: string): Promise<string[]> {
  await db();
  const p = (await Program.findOne({ _id: programId, orgId }).select('students').lean()) as any;
  return (p?.students ?? []).map(String);
}
