'use server';

// =============================================================================
// FILE: app/(app)/grading/actions.ts   (NEW FILE)
// Grading queue actions. Mentors (their programs) and admins (all).
// AI requests are rate-limited per person and capped per month (Settings).
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireAuth, hasPermission } from '@/lib/auth-helpers';
import { requestSuggestions, processNext, approveGrade, rejectSuggestion, saveSetup } from '@/lib/grading';
import { hit } from '@/lib/rate-limit';

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const id = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id');

async function grader(perm: 'grading.review' | 'grading.ai.use') {
  const u = await requireAuth();
  if (u.role === 'student' || !(await hasPermission(u, perm))) return null;
  return u;
}

export async function requestAiAction(raw: unknown): Promise<Res<{ queued: number }>> {
  const u = await grader('grading.ai.use');
  if (!u) return { ok: false, error: 'Not allowed' };
  const p = z.object({ submissionIds: z.array(id).min(1).max(200) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Choose at least one submission.' };
  if ((await hit(`ai-request:${u.id}`, 3600)) > 30) return { ok: false, error: 'Too many AI batches this hour — please wait a little.' };
  return requestSuggestions(u, p.data.submissionIds);
}

/** Called repeatedly by the browser to work through a batch, one at a time. */
export async function processNextAction(raw: unknown): Promise<Res<{ processed: string | null; remaining: number; status?: string; error?: string }>> {
  const u = await grader('grading.ai.use');
  if (!u) return { ok: false, error: 'Not allowed' };
  const p = z.object({ assignmentId: id.optional() }).safeParse(raw ?? {});
  if (!p.success) return { ok: false, error: 'Invalid request' };
  if ((await hit(`ai-process:${u.id}`, 60)) > 40) return { ok: false, error: 'Slow down — try again in a minute.' };
  const r = await processNext(u, p.data.assignmentId);
  return { ok: true, ...r };
}

export async function approveGradeAction(raw: unknown): Promise<Res> {
  const u = await grader('grading.review');
  if (!u) return { ok: false, error: 'Not allowed' };
  const p = z
    .object({ submissionId: id, suggestionId: id.optional(), marks: z.number().min(0).max(100000), feedback: z.string().max(6000).default('') })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the marks' };
  const r = await approveGrade(u, p.data);
  if (r.ok) {
    revalidatePath('/grading');
    revalidatePath('/assignments');
  }
  return r;
}

export async function rejectSuggestionAction(raw: unknown): Promise<Res> {
  const u = await grader('grading.review');
  if (!u) return { ok: false, error: 'Not allowed' };
  const p = z.object({ suggestionId: id, reason: z.string().trim().max(300).default('') }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid request' };
  const r = await rejectSuggestion(u, p.data.suggestionId, p.data.reason);
  if (r.ok) revalidatePath('/grading');
  return r;
}

const criterion = z.object({
  id: z.string().max(24).default(''),
  title: z.string().trim().max(120),
  description: z.string().max(1000).default(''),
  maxPoints: z.number().min(0.5).max(1000),
});

export async function saveSetupAction(raw: unknown): Promise<Res> {
  const u = await grader('grading.review');
  if (!u) return { ok: false, error: 'Not allowed' };
  const p = z
    .object({
      assignmentId: id,
      rubric: z.array(criterion).max(20),
      referenceAnswer: z.string().max(20000).default(''),
      guidance: z.string().max(4000).default(''),
      aiEnabled: z.boolean(),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the rubric' };
  const { assignmentId, ...rest } = p.data;
  const r = await saveSetup(u, assignmentId, rest);
  if (r.ok) revalidatePath('/grading');
  return r;
}
