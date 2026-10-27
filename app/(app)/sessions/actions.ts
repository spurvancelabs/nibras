'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireRole } from '@/lib/auth-helpers';
import {
  createSession,
  updateSession,
  deleteSession,
  getSession,
  canManageSession,
} from '@/lib/sessions';
import { isProgramActive } from '@/lib/programs';
import { SESSION_STATUSES } from '@/models/Session';
import { Types } from 'mongoose';
import Program from '@/models/Program';
import { auditBy } from '@/lib/audit';

const urlOrEmpty = z
  .string()
  .max(500)
  .refine(
    (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
    { message: 'Must be a valid URL starting with http:// or https://' }
  )
  .optional()
  .default('');

const upsertSchema = z
  .object({
    id: z.string().optional(),
    programId: z.string().min(1),
    mentorId: z.string().optional(), // required for admins, ignored for mentors
    title: z.string().min(1).max(200),
    agenda: z.string().max(4000).optional().default(''),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    meetingUrl: urlOrEmpty,
    recordingUrl: urlOrEmpty,
    status: z.enum(SESSION_STATUSES).optional(),
    access: z.enum(['free', 'premium', 'tokens']).optional().default('free'),
    tokenPrice: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'End time must be after start time',
    path: ['endsAt'],
  });

const deleteSchema = z.object({ id: z.string().min(1) });

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function saveSessionAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') {
    return { ok: false, error: 'Not allowed' };
  }

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  // Verify program exists in this org and user is allowed to write to it.
  if (!Types.ObjectId.isValid(data.programId)) {
    return { ok: false, error: 'Invalid program' };
  }
  const program = await Program.findOne({
    _id: data.programId,
    orgId: user.orgId,
  })
    .select('mentors')
    .lean();
  if (!program) return { ok: false, error: 'Program not found' };

  const active = await isProgramActive(user.orgId, data.programId);
  if (!active) {
    return { ok: false, error: 'Cannot modify sessions in a draft or archived program' };
  }

  if (user.role === 'mentor') {
    const isMentor =
      (program.mentors ?? []).map(String).includes(user.id);
    if (!isMentor) {
      return { ok: false, error: 'You are not a mentor of this program' };
    }
  }

  if (data.id) {
    // Verify user can manage the existing session
    const existing = await getSession(user.orgId, data.id);
    if (!existing) return { ok: false, error: 'Session not found' };
    const can = await canManageSession(
      user.orgId,
      user,
      existing.mentorId,
      existing.programId
    );
    if (!can) return { ok: false, error: 'Not allowed' };

    const res = await updateSession(user.orgId, data.id, {
      title: data.title,
      agenda: data.agenda,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      meetingUrl: data.meetingUrl,
      recordingUrl: data.recordingUrl,
      status: data.status,
      access: data.access,
      tokenPrice: data.access === 'tokens' ? data.tokenPrice : 0,
    });
    if (!res.ok) return res;
    if (existing.access !== data.access || (data.access === 'tokens' && existing.tokenPrice !== data.tokenPrice)) {
      await auditBy(user, 'session.access', `${data.title}: ${data.access}${data.access === 'tokens' ? ` (${data.tokenPrice})` : ''}`, [], { sessionId: data.id });
    }

    revalidatePath('/sessions');
    revalidatePath(`/sessions/${data.id}`);
    revalidatePath('/dashboard');
    return { ok: true, id: data.id };
  }

  // Admins can pick any mentor. Mentors are always themselves.
  let mentorIdForCreate = user.id;
  if (user.role === 'admin') {
    if (!data.mentorId) {
      return { ok: false, error: 'Choose a mentor for this session' };
    }
    // Verify the chosen mentor actually mentors this program
    const isMentor = (program.mentors ?? []).map(String).includes(data.mentorId);
    if (!isMentor) {
      return { ok: false, error: 'Chosen mentor is not in this program' };
    }
    mentorIdForCreate = data.mentorId;
  }

  const res = await createSession({
    orgId: user.orgId,
    programId: data.programId,
    title: data.title,
    agenda: data.agenda,
    mentorId: mentorIdForCreate,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    meetingUrl: data.meetingUrl,
    recordingUrl: data.recordingUrl,
    status: data.status,
    createdBy: user.id,
    access: data.access,
    tokenPrice: data.access === 'tokens' ? data.tokenPrice : 0,
  });
  if (!res.ok) return res;

  revalidatePath('/sessions');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function deleteSessionAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const existing = await getSession(user.orgId, parsed.data.id);
  if (!existing) return { ok: false, error: 'Session not found' };

  const can = await canManageSession(
    user.orgId,
    user,
    existing.mentorId,
    existing.programId
  );
  if (!can) return { ok: false, error: 'Not allowed' };

  const res = await deleteSession(user.orgId, parsed.data.id);
  if (!res.ok) return res;
  await auditBy(user, 'session.delete', existing.title, [], { sessionId: parsed.data.id, programId: existing.programId });

  revalidatePath('/sessions');
  revalidatePath('/dashboard');
  return { ok: true };
}
// ---------------------------------------------------------------------------
// Unlock a token-priced session (learners)
// ---------------------------------------------------------------------------

export async function unlockSessionAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = z.object({ id: z.string().refine((v) => Types.ObjectId.isValid(v)) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid session' };
  const session = await getSession(user.orgId, parsed.data.id);
  if (!session) return { ok: false, error: 'Session not found' };
  if (user.role === 'student') {
    const inProgram = await Program.exists({ _id: session.programId, orgId: user.orgId, students: user.id });
    if (!inProgram) return { ok: false, error: 'This session is not in your programs.' };
  }
  const { unlockSession } = await import('@/lib/session-access');
  const r = await unlockSession(user, session);
  if (r.ok) revalidatePath(`/sessions/${session.id}`);
  return r;
}
