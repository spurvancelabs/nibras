// =============================================================================
// FILE: lib/grading.ts   (NEW FILE — server only)
// Grading queue + AI-assisted grading.
//
//   queue            ungraded submissions in the programs you teach (admins: all)
//   rubric setup     criteria, private reference answer, guidance
//   AI suggestions   requested → queued → processed one at a time (each call
//                    fits the 10 s server limit; batches are driven by the
//                    browser and an atomic claim stops double work)
//   review           mentor approves (maybe edited), rejects, or grades by hand
//
// Rules: AI never publishes a grade. Students only see what a mentor
// approved. Every suggestion, approval and rejection is kept and audited.
// Objective quiz questions are still marked by fixed rules (lib/quizzes).
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import Program from '@/models/Program';
import Assignment from '@/models/Assignment';
import Submission from '@/models/Submission';
import User from '@/models/User';
import GradingConfig from '@/models/GradingConfig';
import GradeSuggestion, { type SuggestionStatus } from '@/models/GradeSuggestion';
import AiUsage from '@/models/AiUsage';
import { getSettings } from './settings';
import { aiConfigured, aiModelName, chatJson, AiError } from './ai-provider';
import { buildPrompt, parseSuggestion, mockAnswer, effectiveRubric, type Criterion } from './ai-grading-core';
import { gradeSubmission } from './submissions';
import { auditBy } from './audit';
import { notify } from './notifications';

const oid = (id: string) => new Types.ObjectId(id);
const isId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

export type Grader = { id: string; orgId: string; role: string; name?: string | null; email?: string | null };

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export type GradableAssignment = { id: string; title: string; programId: string; programName: string; maxMarks: number; dueAt: string };

export async function gradableAssignments(u: Grader): Promise<GradableAssignment[]> {
  await db();
  const pq: Record<string, unknown> = { orgId: oid(u.orgId) };
  if (u.role !== 'admin') pq.mentors = oid(u.id);
  const progs = (await Program.find(pq).select('name').lean()) as { _id: unknown; name: string }[];
  if (!progs.length) return [];
  const pname = new Map(progs.map((p) => [String(p._id), p.name]));
  const rows = (await Assignment.find({ orgId: oid(u.orgId), programId: { $in: progs.map((p) => p._id) } })
    .select('title programId maxMarks dueAt')
    .sort({ dueAt: -1 })
    .limit(500)
    .lean()) as { _id: unknown; title: string; programId: unknown; maxMarks: number; dueAt: Date }[];
  return rows.map((a) => ({
    id: String(a._id),
    title: a.title,
    programId: String(a.programId),
    programName: pname.get(String(a.programId)) ?? '',
    maxMarks: a.maxMarks,
    dueAt: new Date(a.dueAt).toISOString(),
  }));
}

async function assertCanGrade(u: Grader, assignmentId: string): Promise<{ title: string; description: string; maxMarks: number; programId: string } | null> {
  if (!isId(assignmentId)) return null;
  await db();
  const a = (await Assignment.findOne({ _id: oid(assignmentId), orgId: oid(u.orgId) }).select('title description maxMarks programId').lean()) as
    | { title: string; description?: string; maxMarks: number; programId: unknown }
    | null;
  if (!a) return null;
  if (u.role !== 'admin') {
    const ok = await Program.exists({ _id: a.programId, orgId: oid(u.orgId), mentors: oid(u.id) });
    if (!ok) return null;
  }
  return { title: a.title, description: a.description ?? '', maxMarks: a.maxMarks, programId: String(a.programId) };
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export type QueueRow = {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  programName: string;
  maxMarks: number;
  studentName: string;
  submittedAt: string;
  late: boolean;
  graded: boolean;
  marks: number | null;
  /** latest AI suggestion */
  ai: { id: string; status: SuggestionStatus; marks: number | null; confidence: number | null; flags: string[] } | null;
  /** Graded from an approved AI suggestion. */
  aiApproved: boolean;
};

export async function gradingQueue(u: Grader, opts: { assignmentId?: string; show?: 'todo' | 'graded' | 'all' } = {}): Promise<{ rows: QueueRow[]; assignments: GradableAssignment[] }> {
  const assignments = await gradableAssignments(u);
  const scope = opts.assignmentId ? assignments.filter((a) => a.id === opts.assignmentId) : assignments;
  if (!scope.length) return { rows: [], assignments };
  const amap = new Map(scope.map((a) => [a.id, a]));
  const q: Record<string, unknown> = { orgId: oid(u.orgId), assignmentId: { $in: scope.map((a) => oid(a.id)) } };
  if ((opts.show ?? 'todo') === 'todo') q.marks = null;
  if (opts.show === 'graded') q.marks = { $ne: null };
  const subs = (await Submission.find(q).select('assignmentId studentId submittedAt marks').sort({ submittedAt: 1 }).limit(1000).lean()) as {
    _id: unknown;
    assignmentId: unknown;
    studentId: unknown;
    submittedAt: Date;
    marks: number | null;
  }[];
  const [students, sugg] = await Promise.all([
    User.find({ _id: { $in: subs.map((s) => s.studentId) }, orgId: oid(u.orgId) }).select('name').lean(),
    GradeSuggestion.find({ orgId: oid(u.orgId), submissionId: { $in: subs.map((s) => s._id) }, status: { $ne: 'superseded' } })
      .select('submissionId status marks confidence flags createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const sname = new Map((students as { _id: unknown; name: string }[]).map((s) => [String(s._id), s.name]));
  const latest = new Map<string, { _id: unknown; status: SuggestionStatus; marks: number | null; confidence: number | null; flags?: string[] }>();
  for (const g of sugg as { _id: unknown; submissionId: unknown; status: SuggestionStatus; marks: number | null; confidence: number | null; flags?: string[] }[]) {
    const k = String(g.submissionId);
    if (!latest.has(k)) latest.set(k, g);
  }
  const rows: QueueRow[] = subs.map((s) => {
    const a = amap.get(String(s.assignmentId))!;
    const g = latest.get(String(s._id));
    return {
      submissionId: String(s._id),
      assignmentId: a.id,
      assignmentTitle: a.title,
      programName: a.programName,
      maxMarks: a.maxMarks,
      studentName: sname.get(String(s.studentId)) ?? 'Unknown',
      submittedAt: new Date(s.submittedAt).toISOString(),
      late: new Date(s.submittedAt).getTime() > new Date(a.dueAt).getTime(),
      graded: s.marks !== null && s.marks !== undefined,
      marks: s.marks ?? null,
      ai: g ? { id: String(g._id), status: g.status, marks: g.marks, confidence: g.confidence, flags: g.flags ?? [] } : null,
      aiApproved: g?.status === 'approved',
    };
  });
  // Needs-attention first: AI ready with flags / low confidence, then ready, then the rest (oldest first)
  const rank = (r: QueueRow) => (r.ai?.status === 'ready' ? ((r.ai.flags.length || (r.ai.confidence ?? 1) < 0.5) ? 0 : 1) : r.ai?.status === 'failed' ? 2 : 3);
  if ((opts.show ?? 'todo') === 'todo') rows.sort((x, y) => rank(x) - rank(y));
  return { rows, assignments };
}

// ---------------------------------------------------------------------------
// Rubric / config
// ---------------------------------------------------------------------------

export type GradingSetup = { rubric: Criterion[]; referenceAnswer: string; guidance: string; aiEnabled: boolean };

export async function getSetup(u: Grader, assignmentId: string): Promise<(GradingSetup & { assignment: { title: string; maxMarks: number; description: string } }) | null> {
  const a = await assertCanGrade(u, assignmentId);
  if (!a) return null;
  const c = (await GradingConfig.findOne({ orgId: oid(u.orgId), assignmentId: oid(assignmentId) }).select('+referenceAnswer').lean()) as
    | { rubric?: Criterion[]; referenceAnswer?: string; guidance?: string; aiEnabled?: boolean }
    | null;
  return {
    assignment: { title: a.title, maxMarks: a.maxMarks, description: a.description },
    rubric: (c?.rubric ?? []).map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', maxPoints: r.maxPoints })),
    referenceAnswer: c?.referenceAnswer ?? '',
    guidance: c?.guidance ?? '',
    aiEnabled: c?.aiEnabled !== false,
  };
}

export async function saveSetup(u: Grader, assignmentId: string, input: GradingSetup): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await assertCanGrade(u, assignmentId);
  if (!a) return { ok: false, error: 'Not allowed' };
  const rubric = input.rubric
    .filter((c) => c.title.trim())
    .slice(0, 20)
    .map((c) => ({ id: (c.id || crypto.randomBytes(4).toString('hex')).replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || crypto.randomBytes(4).toString('hex'), title: c.title.trim().slice(0, 120), description: c.description.slice(0, 1000), maxPoints: Math.min(1000, Math.max(0.5, Number(c.maxPoints) || 1)) }));
  await GradingConfig.updateOne(
    { orgId: oid(u.orgId), assignmentId: oid(assignmentId) },
    { $set: { rubric, referenceAnswer: input.referenceAnswer.slice(0, 20000), guidance: input.guidance.slice(0, 4000), aiEnabled: input.aiEnabled, updatedBy: oid(u.id) } },
    { upsert: true }
  );
  await auditBy(u, 'ai.config', `Grading setup for “${a.title}” (${rubric.length} criteria${input.aiEnabled ? ', AI on' : ', AI off'})`, [], { assignmentId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// AI availability & budget
// ---------------------------------------------------------------------------

export type AiStatus = { available: boolean; reason: string; used: number; limit: number; model: string };

function month(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function aiStatus(orgId: string): Promise<AiStatus> {
  const s = await getSettings();
  await db();
  const usage = (await AiUsage.findOne({ orgId: oid(orgId), month: month() }).select('requests').lean()) as { requests?: number } | null;
  const used = usage?.requests ?? 0;
  const limit = s.aiMonthlyLimit;
  let reason = '';
  if (!s.aiGradingEnabled) reason = 'AI grading is switched off in Settings.';
  else if (!aiConfigured()) reason = 'No AI provider is configured on the server.';
  else if (used >= limit) reason = `This month's AI limit (${limit}) is used up. Grade by hand until next month.`;
  return { available: !reason, reason, used, limit, model: aiModelName() };
}

/** Atomically take one unit of the monthly budget. */
async function takeBudget(orgId: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  try {
    const r = await AiUsage.findOneAndUpdate(
      { orgId: oid(orgId), month: month(), requests: { $lt: limit } },
      { $inc: { requests: 1 } },
      { upsert: true, new: true }
    ).lean();
    return !!r;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false; // at the limit (upsert collided)
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Requests & processing
// ---------------------------------------------------------------------------

export async function requestSuggestions(u: Grader, submissionIds: string[]): Promise<{ ok: true; queued: number } | { ok: false; error: string }> {
  const st = await aiStatus(u.orgId);
  if (!st.available) return { ok: false, error: st.reason };
  const ids = [...new Set(submissionIds)].filter(isId).slice(0, 200);
  if (!ids.length) return { ok: false, error: 'Choose at least one submission.' };
  await db();
  const subs = (await Submission.find({ _id: { $in: ids.map(oid) }, orgId: oid(u.orgId) }).select('assignmentId studentId updatedAt').lean()) as {
    _id: unknown;
    assignmentId: unknown;
    studentId: unknown;
    updatedAt: Date;
  }[];
  const allowed = new Map<string, boolean>();
  let queued = 0;
  for (const s of subs) {
    const aid = String(s.assignmentId);
    if (!allowed.has(aid)) {
      const a = await assertCanGrade(u, aid);
      const cfg = a ? ((await GradingConfig.findOne({ orgId: oid(u.orgId), assignmentId: oid(aid) }).select('aiEnabled').lean()) as { aiEnabled?: boolean } | null) : null;
      allowed.set(aid, !!a && cfg?.aiEnabled !== false);
    }
    if (!allowed.get(aid)) continue;
    // supersede older open suggestions for this submission
    await GradeSuggestion.updateMany({ orgId: oid(u.orgId), submissionId: s._id, status: { $in: ['queued', 'ready', 'failed'] } }, { $set: { status: 'superseded' } });
    await GradeSuggestion.create({
      orgId: oid(u.orgId),
      assignmentId: s.assignmentId,
      submissionId: s._id,
      studentId: s.studentId,
      status: 'queued',
      requestedBy: oid(u.id),
      submissionAt: s.updatedAt,
    });
    queued++;
  }
  if (!queued) return { ok: false, error: 'AI is turned off for these assignments, or you cannot grade them.' };
  return { ok: true, queued };
}

const TEXT_FORMATS = new Set(['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rb', 'php', 'html', 'css', 'sql', 'xml', 'yaml', 'yml']);

/** Reads small text attachments from this organisation's Cloudinary only. */
async function readTextAttachments(atts: { url: string; format?: string; size?: number; originalName?: string }[]): Promise<{ text: string; unread: number }> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  let text = '';
  let unread = 0;
  for (const a of atts.slice(0, 5)) {
    const ext = (a.format || a.originalName?.split('.').pop() || '').toLowerCase();
    let ok = false;
    try {
      const url = new URL(a.url);
      if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && cloud && url.pathname.startsWith(`/${cloud}/`) && TEXT_FORMATS.has(ext) && (a.size ?? 0) <= 200_000) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(url, { signal: ctrl.signal, redirect: 'error' });
        clearTimeout(t);
        if (res.ok) {
          const body = (await res.text()).slice(0, 60_000);
          text += `\n[${a.originalName || 'file'}]\n${body}`;
          ok = true;
        }
      }
    } catch {
      /* unreadable → counted below */
    }
    if (!ok) unread++;
  }
  return { text, unread };
}

/**
 * Process ONE queued suggestion (atomic claim). Returns what's left so the
 * browser can keep calling for a batch. Stale claims (> 2 min) are retried.
 */
export async function processNext(u: Grader, assignmentId?: string): Promise<{ processed: string | null; status?: SuggestionStatus; remaining: number; error?: string }> {
  await db();
  const s = await getSettings();
  const scope = await gradableAssignments(u);
  const ids = (assignmentId ? scope.filter((a) => a.id === assignmentId) : scope).map((a) => oid(a.id));
  const base = { orgId: oid(u.orgId), assignmentId: { $in: ids } };
  const stale = new Date(Date.now() - 120_000);
  const claimed = (await GradeSuggestion.findOneAndUpdate(
    { ...base, $or: [{ status: 'queued' }, { status: 'processing', claimedAt: { $lt: stale } }], attempts: { $lt: 3 } },
    { $set: { status: 'processing', claimedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  ).lean()) as { _id: unknown; submissionId: unknown; assignmentId: unknown } | null;
  const remaining = async () => GradeSuggestion.countDocuments({ ...base, status: { $in: ['queued', 'processing'] } });
  if (!claimed) return { processed: null, remaining: await remaining() };

  const fail = async (msg: string, retry = false) => {
    await GradeSuggestion.updateOne({ _id: claimed._id }, { $set: retry ? { status: 'queued', error: msg.slice(0, 300) } : { status: 'failed', error: msg.slice(0, 300), processedAt: new Date() } });
    return { processed: String(claimed._id), status: (retry ? 'queued' : 'failed') as SuggestionStatus, remaining: await remaining(), error: msg };
  };

  if (!s.aiGradingEnabled || !aiConfigured()) return fail('AI grading is not available.');
  const a = await assertCanGrade(u, String(claimed.assignmentId));
  if (!a) return fail('Not allowed');
  if (!(await takeBudget(u.orgId, s.aiMonthlyLimit))) return fail(`Monthly AI limit (${s.aiMonthlyLimit}) reached.`);

  const sub = (await Submission.findOne({ _id: claimed.submissionId, orgId: oid(u.orgId) }).select('text attachments').lean()) as {
    text?: string;
    attachments?: { url: string; format?: string; size?: number; originalName?: string }[];
  } | null;
  if (!sub) return fail('Submission not found');
  const cfg = (await GradingConfig.findOne({ orgId: oid(u.orgId), assignmentId: claimed.assignmentId }).select('+referenceAnswer').lean()) as
    | { rubric?: Criterion[]; referenceAnswer?: string; guidance?: string }
    | null;
  const att = await readTextAttachments(sub.attachments ?? []);
  const input = {
    assignmentTitle: a.title,
    assignmentDescription: a.description,
    maxMarks: a.maxMarks,
    rubric: (cfg?.rubric ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description ?? '', maxPoints: c.maxPoints })),
    referenceAnswer: cfg?.referenceAnswer ?? '',
    guidance: cfg?.guidance ?? '',
    submissionText: sub.text ?? '',
    attachmentText: att.text,
    maxChars: s.aiMaxChars,
  };
  const prep = buildPrompt(input, crypto.randomBytes(6).toString('hex'));
  if (att.unread) prep.flags.push('attachment_unread');

  try {
    const res = await chatJson(prep.messages, { maxTokens: 1400, mock: () => mockAnswer(input, prep.rubric) });
    const parsed = parseSuggestion(res.text, prep.rubric, a.maxMarks, prep.flags);
    await GradeSuggestion.updateOne(
      { _id: claimed._id },
      { $set: { status: 'ready', scores: parsed.scores, marks: parsed.marks, feedback: parsed.feedback, confidence: parsed.confidence, flags: parsed.flags, model: aiModelName(), tokens: res.tokens, error: '', processedAt: new Date() } }
    );
    if (res.tokens) await AiUsage.updateOne({ orgId: oid(u.orgId), month: month() }, { $inc: { tokens: res.tokens } });
    await auditBy(u, 'ai.suggested', `AI suggestion for “${a.title}”: ${parsed.marks}/${a.maxMarks} (confidence ${Math.round(parsed.confidence * 100)}%)`, [], {
      suggestionId: String(claimed._id),
      submissionId: String(claimed.submissionId),
      flags: parsed.flags,
    });
    return { processed: String(claimed._id), status: 'ready', remaining: await remaining() };
  } catch (e) {
    const retry = e instanceof AiError && e.retryable;
    return fail(e instanceof Error ? e.message : 'AI request failed', retry);
  }
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export type ReviewData = {
  submission: { id: string; text: string; attachments: { url: string; name: string }[]; submittedAt: string; marks: number | null; feedback: string; studentName: string; late: boolean };
  assignment: { id: string; title: string; description: string; maxMarks: number; dueAt: string };
  rubric: Criterion[];
  suggestion: {
    id: string;
    status: SuggestionStatus;
    scores: { criterionId: string; points: number; comment: string }[];
    marks: number | null;
    feedback: string;
    confidence: number | null;
    flags: string[];
    model: string;
    error: string;
    stale: boolean;
    createdAt: string;
  } | null;
  history: { id: string; status: SuggestionStatus; marks: number | null; finalMarks: number | null; edited: boolean; at: string }[];
  /** Next ungraded submission in the same assignment (for "Approve & next"). */
  nextId: string | null;
};

export async function getReview(u: Grader, submissionId: string): Promise<ReviewData | null> {
  if (!isId(submissionId)) return null;
  await db();
  const sub = (await Submission.findOne({ _id: oid(submissionId), orgId: oid(u.orgId) }).lean()) as {
    _id: unknown;
    assignmentId: unknown;
    studentId: unknown;
    text?: string;
    attachments?: { url: string; originalName?: string }[];
    submittedAt: Date;
    updatedAt: Date;
    marks: number | null;
    feedback?: string;
  } | null;
  if (!sub) return null;
  const a = await assertCanGrade(u, String(sub.assignmentId));
  if (!a) return null;
  const [assignment, student, cfg, suggs, next] = await Promise.all([
    Assignment.findOne({ _id: sub.assignmentId }).select('dueAt').lean() as Promise<{ dueAt: Date } | null>,
    User.findOne({ _id: sub.studentId, orgId: oid(u.orgId) }).select('name').lean() as Promise<{ name: string } | null>,
    GradingConfig.findOne({ orgId: oid(u.orgId), assignmentId: sub.assignmentId }).select('rubric').lean() as Promise<{ rubric?: Criterion[] } | null>,
    GradeSuggestion.find({ orgId: oid(u.orgId), submissionId: sub._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Submission.findOne({ orgId: oid(u.orgId), assignmentId: sub.assignmentId, marks: null, _id: { $ne: sub._id } }).select('_id').sort({ submittedAt: 1 }).lean() as Promise<{ _id: unknown } | null>,
  ]);
  const rubric = effectiveRubric((cfg?.rubric ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description ?? '', maxPoints: c.maxPoints })), a.maxMarks);
  type S = { _id: unknown; status: SuggestionStatus; scores?: { criterionId: string; points: number; comment?: string }[]; marks: number | null; feedback?: string; confidence: number | null; flags?: string[]; model?: string; error?: string; submissionAt?: Date | null; createdAt: Date; finalMarks: number | null; edited?: boolean };
  const list = suggs as unknown as S[];
  const cur = list.find((g) => g.status !== 'superseded') ?? null;
  const dueAt = assignment ? new Date(assignment.dueAt) : new Date(0);
  return {
    submission: {
      id: String(sub._id),
      text: sub.text ?? '',
      attachments: (sub.attachments ?? []).map((x) => ({ url: x.url, name: x.originalName || 'Attachment' })),
      submittedAt: new Date(sub.submittedAt).toISOString(),
      marks: sub.marks ?? null,
      feedback: sub.feedback ?? '',
      studentName: student?.name ?? 'Unknown',
      late: new Date(sub.submittedAt).getTime() > dueAt.getTime(),
    },
    assignment: { id: String(sub.assignmentId), title: a.title, description: a.description, maxMarks: a.maxMarks, dueAt: dueAt.toISOString() },
    rubric,
    suggestion: cur
      ? {
          id: String(cur._id),
          status: cur.status,
          scores: (cur.scores ?? []).map((x) => ({ criterionId: x.criterionId, points: x.points, comment: x.comment ?? '' })),
          marks: cur.marks,
          feedback: cur.feedback ?? '',
          confidence: cur.confidence,
          flags: cur.flags ?? [],
          model: cur.model ?? '',
          error: cur.error ?? '',
          stale: !!cur.submissionAt && new Date(sub.updatedAt).getTime() > new Date(cur.submissionAt).getTime() + 1000,
          createdAt: new Date(cur.createdAt).toISOString(),
        }
      : null,
    history: list.map((g) => ({ id: String(g._id), status: g.status, marks: g.marks, finalMarks: g.finalMarks, edited: g.edited === true, at: new Date(g.createdAt).toISOString() })),
    nextId: next ? String(next._id) : null,
  };
}

/** Mentor's decision. With a suggestion → AI-assisted; without → manual grade. */
export async function approveGrade(
  u: Grader,
  input: { submissionId: string; suggestionId?: string; marks: number; feedback: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await getReview(u, input.submissionId);
  if (!r) return { ok: false, error: 'Not allowed' };
  if (!Number.isFinite(input.marks) || input.marks < 0 || input.marks > r.assignment.maxMarks) return { ok: false, error: `Marks must be between 0 and ${r.assignment.maxMarks}` };
  let sugg: { marks: number | null; feedback: string } | null = null;
  if (input.suggestionId) {
    if (!r.suggestion || r.suggestion.id !== input.suggestionId || r.suggestion.status !== 'ready') return { ok: false, error: 'This suggestion changed — reload the page.' };
    sugg = { marks: r.suggestion.marks, feedback: r.suggestion.feedback };
  }
  const res = await gradeSubmission({ orgId: u.orgId, submissionId: input.submissionId, marks: input.marks, feedback: input.feedback.slice(0, 6000), gradedBy: u.id });
  if (!res.ok) return res;
  const edited = !!sugg && (sugg.marks !== input.marks || sugg.feedback.trim() !== input.feedback.trim());
  if (input.suggestionId) {
    await GradeSuggestion.updateOne(
      { _id: oid(input.suggestionId), orgId: oid(u.orgId), status: 'ready' },
      { $set: { status: 'approved', reviewedBy: oid(u.id), reviewedAt: new Date(), finalMarks: input.marks, finalFeedback: input.feedback.slice(0, 6000), edited } }
    );
  }
  const studentId = ((await Submission.findOne({ _id: oid(input.submissionId) }).select('studentId').lean()) as { studentId: unknown } | null)?.studentId;
  await auditBy(
    u,
    input.suggestionId ? 'ai.approved' : 'grade.update',
    `${r.assignment.title}: ${input.marks}/${r.assignment.maxMarks}${input.suggestionId ? (edited ? ` (AI suggested ${sugg?.marks}, edited)` : ' (AI suggestion approved)') : ''}`,
    studentId ? [String(studentId)] : [],
    { submissionId: input.submissionId, assignmentId: r.assignment.id, suggestionId: input.suggestionId ?? null, aiMarks: sugg?.marks ?? null, finalMarks: input.marks, edited }
  );
  if (studentId) {
    await notify({
      orgId: u.orgId,
      userId: String(studentId),
      type: 'assignment.graded',
      title: `Graded: ${r.assignment.title}`,
      body: `You scored ${input.marks}/${r.assignment.maxMarks}.${input.feedback ? `\n\nFeedback: ${input.feedback}` : ''}`,
      link: `/assignments/${r.assignment.id}`,
      email: true,
      dedupeKey: `graded:${input.submissionId}:${Date.now()}`,
    });
  }
  return { ok: true };
}

export async function rejectSuggestion(u: Grader, suggestionId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isId(suggestionId)) return { ok: false, error: 'Not found' };
  await db();
  const g = (await GradeSuggestion.findOne({ _id: oid(suggestionId), orgId: oid(u.orgId), status: { $in: ['ready', 'failed'] } }).select('assignmentId submissionId marks').lean()) as
    | { assignmentId: unknown; submissionId: unknown; marks: number | null }
    | null;
  if (!g) return { ok: false, error: 'Already handled' };
  const a = await assertCanGrade(u, String(g.assignmentId));
  if (!a) return { ok: false, error: 'Not allowed' };
  await GradeSuggestion.updateOne({ _id: oid(suggestionId) }, { $set: { status: 'rejected', reviewedBy: oid(u.id), reviewedAt: new Date(), finalFeedback: reason.slice(0, 300) } });
  await auditBy(u, 'ai.rejected', `AI suggestion rejected for “${a.title}” (${g.marks ?? '—'}/${a.maxMarks})${reason ? `: ${reason}` : ''}`, [], { suggestionId, submissionId: String(g.submissionId) });
  return { ok: true };
}

export type GradingStats = { toGrade: number; aiReady: number; aiApproved30: number; aiEditedPct: number | null; usage: number; limit: number };

export async function gradingStats(u: Grader): Promise<GradingStats> {
  const scope = await gradableAssignments(u);
  const ids = scope.map((a) => oid(a.id));
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [toGrade, aiReady, approved, edited, st] = await Promise.all([
    Submission.countDocuments({ orgId: oid(u.orgId), assignmentId: { $in: ids }, marks: null }),
    GradeSuggestion.countDocuments({ orgId: oid(u.orgId), assignmentId: { $in: ids }, status: 'ready' }),
    GradeSuggestion.countDocuments({ orgId: oid(u.orgId), assignmentId: { $in: ids }, status: 'approved', reviewedAt: { $gte: since } }),
    GradeSuggestion.countDocuments({ orgId: oid(u.orgId), assignmentId: { $in: ids }, status: 'approved', edited: true, reviewedAt: { $gte: since } }),
    aiStatus(u.orgId),
  ]);
  return { toGrade, aiReady, aiApproved30: approved, aiEditedPct: approved ? Math.round((edited / approved) * 100) : null, usage: st.used, limit: st.limit };
}
