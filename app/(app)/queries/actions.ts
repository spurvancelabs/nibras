'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import {
  createQuery,
  addReply,
  getQuery,
  canViewQuery,
  setQueryStatus,
  deleteQuery,
} from '@/lib/queries';
import { QUERY_STATUSES } from '@/lib/constants';

const attachmentSchema = z.object({
  url: z.string().min(1).max(1000),
  publicId: z.string().max(500).optional().default(''),
  resourceType: z.string().max(50).optional().default('image'),
  format: z.string().max(20).optional().default(''),
  size: z.number().nonnegative().optional().default(0),
  originalName: z.string().max(300).optional().default(''),
});

const createSchema = z.object({
  programId: z.string().min(1),
  sessionId: z.string().nullable().optional(),
  subject: z.string().min(3).max(200),
  body: z.string().min(1).max(5000),
  attachments: z.array(attachmentSchema).max(10).optional().default([]),
});

const replySchema = z.object({
  queryId: z.string().min(1),
  body: z.string().min(1).max(5000),
  attachments: z.array(attachmentSchema).max(10).optional().default([]),
});

const statusSchema = z.object({
  queryId: z.string().min(1),
  status: z.enum(QUERY_STATUSES),
});

const idSchema = z.object({ queryId: z.string().min(1) });

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createQueryAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role !== 'student') {
    return { ok: false, error: 'Only students can start a query' };
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await createQuery({
    orgId: user.orgId,
    programId: parsed.data.programId,
    sessionId: parsed.data.sessionId ?? null,
    studentId: user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    attachments: parsed.data.attachments,
  });
  if (!res.ok) return res;

  revalidatePath('/queries');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function replyAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();

  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const q = await getQuery(user.orgId, parsed.data.queryId);
  if (!q) return { ok: false, error: 'Query not found' };

  const canView = await canViewQuery(user.orgId, user, {
    studentId: q.studentId,
    programId: q.programId,
  });
  if (!canView) return { ok: false, error: 'Not allowed' };

  const res = await addReply({
    orgId: user.orgId,
    queryId: parsed.data.queryId,
    senderId: user.id,
    senderRole: user.role,
    body: parsed.data.body,
    attachments: parsed.data.attachments,
  });
  if (!res.ok) return res;

  revalidatePath(`/queries/${parsed.data.queryId}`);
  revalidatePath('/queries');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function setStatusAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') {
    // Students can resolve/reopen their own threads
  } else if (user.role !== 'mentor' && user.role !== 'admin') {
    return { ok: false, error: 'Not allowed' };
  }

  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const q = await getQuery(user.orgId, parsed.data.queryId);
  if (!q) return { ok: false, error: 'Query not found' };

  const canView = await canViewQuery(user.orgId, user, {
    studentId: q.studentId,
    programId: q.programId,
  });
  if (!canView) return { ok: false, error: 'Not allowed' };

  const res = await setQueryStatus(
    user.orgId,
    parsed.data.queryId,
    parsed.data.status
  );
  if (!res.ok) return res;

  revalidatePath(`/queries/${parsed.data.queryId}`);
  revalidatePath('/queries');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteQueryAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') {
    return { ok: false, error: 'Students cannot delete threads' };
  }

  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const q = await getQuery(user.orgId, parsed.data.queryId);
  if (!q) return { ok: false, error: 'Query not found' };

  const canView = await canViewQuery(user.orgId, user, {
    studentId: q.studentId,
    programId: q.programId,
  });
  if (!canView) return { ok: false, error: 'Not allowed' };

  const res = await deleteQuery(user.orgId, parsed.data.queryId);
  if (!res.ok) return res;

  revalidatePath('/queries');
  revalidatePath('/dashboard');
  return { ok: true };
}