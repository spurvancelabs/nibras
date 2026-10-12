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
import { notify, notifyMany } from '@/lib/notifications';
import Program from '@/models/Program';

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

  // Notify mentors of the program
  const program = await Program.findOne({
    _id: parsed.data.programId,
    orgId: user.orgId,
  })
    .select('mentors name')
    .lean();
  const mentorIds = (program?.mentors ?? [] as unknown[]).map(String);
  if (mentorIds.length > 0) {
    await notifyMany({
      orgId: user.orgId,
      userIds: mentorIds,
      type: 'query.new',
      title: `New question: ${parsed.data.subject}`,
      body: `From ${user.name ?? 'a student'} in ${program?.name ?? 'your program'}.`,
      link: `/queries/${res.id}`,
      email: true,
    });
  }

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

  // Notify the other side.
  // If replier is the student → notify mentors of the program + assigned mentor.
  // Otherwise → notify the student.
  const preview = parsed.data.body.length > 100
    ? parsed.data.body.slice(0, 100) + '…'
    : parsed.data.body;

  if (user.id === q.studentId) {
    // student replied — notify mentors + assigned mentor
    const program = await Program.findOne({ _id: q.programId, orgId: user.orgId })
      .select('mentors')
      .lean();
    const mentorIds = new Set((program?.mentors ?? [] as unknown[]).map(String));
    if (q.assignedMentorId) mentorIds.add(q.assignedMentorId);
    if (mentorIds.size > 0) {
      await notifyMany({
        orgId: user.orgId,
        userIds: Array.from(mentorIds) as string[],
        type: 'query.reply',
        title: `Reply: ${q.subject}`,
        body: preview,
        link: `/queries/${q.id}`,
        email: false,
      });
    }
  } else {
    // mentor replied — notify student
    await notify({
      orgId: user.orgId,
      userId: q.studentId,
      type: 'query.reply',
      title: `Reply to: ${q.subject}`,
      body: preview,
      link: `/queries/${q.id}`,
      email: true,
      dedupeKey: `reply:${q.id}:${Date.now()}`,
    });
  }

  revalidatePath(`/queries/${parsed.data.queryId}`);
  revalidatePath('/queries');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function setStatusAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();

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