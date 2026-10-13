'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { getSession, canManageSession } from '@/lib/sessions';
import { setSessionAttendance } from '@/lib/attendance';
import { ATTENDANCE_STATUSES } from '@/lib/constants';

const entrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().max(300).optional().default(''),
});

const saveSchema = z.object({
  sessionId: z.string().min(1),
  entries: z.array(entrySchema).max(500),
});

export type ActionResult =
  | { ok: true; count?: number }
  | { ok: false; error: string };

export async function saveAttendanceAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const session = await getSession(user.orgId, parsed.data.sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  const can = await canManageSession(
    user.orgId,
    user,
    session.mentorId,
    session.programId
  );
  if (!can) return { ok: false, error: 'Not allowed' };

  const res = await setSessionAttendance({
    orgId: user.orgId,
    programId: session.programId,
    sessionId: session.id,
    markedBy: user.id,
    entries: parsed.data.entries,
  });
  if (!res.ok) return res;

  revalidatePath(`/sessions/${session.id}`);
  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  return { ok: true, count: res.count };
}