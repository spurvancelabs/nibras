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
import { SESSION_STATUSES } from '@/models/Session';
import { Types } from 'mongoose';
import Program from '@/models/Program';

const upsertSchema = z
  .object({
    id: z.string().optional(),
    programId: z.string().min(1),
    mentorId: z.string().optional(), // required for admins, ignored for mentors
    title: z.string().min(1).max(200),
    agenda: z.string().max(4000).optional().default(''),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    meetingUrl: z.string().max(500).optional().default(''),
    recordingUrl: z.string().max(500).optional().default(''),
    status: z.enum(SESSION_STATUSES).optional(),
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
    });
    if (!res.ok) return res;

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

  revalidatePath('/sessions');
  revalidatePath('/dashboard');
  return { ok: true };
}