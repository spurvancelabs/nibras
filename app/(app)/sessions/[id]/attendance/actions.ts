'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { getSession, canManageSession } from '@/lib/sessions';
import { setSessionAttendance } from '@/lib/attendance';
import { isProgramActive } from '@/lib/programs';
import { ATTENDANCE_STATUSES } from '@/lib/constants';
import { auditBy } from '@/lib/audit';
import { reward } from '@/lib/tokens';

const entrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().max(300).optional().default(''),
});

const saveSchema = z.object({
  sessionId: z.string().min(1),
  entries: z.array(entrySchema).max(500),
  /** markedAt values the editor loaded (conflict detection). */
  base: z.record(z.string(), z.string().nullable()).optional(),
  force: z.boolean().optional().default(false),
});

export type ActionResult =
  | { ok: true; count?: number }
  | { ok: false; error: string; conflicts?: { studentId: string; status: string | null; markedAt: string | null }[] };

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

  const active = await isProgramActive(user.orgId, session.programId);
  if (!active) {
    return { ok: false, error: 'Cannot mark attendance for a draft or archived program' };
  }

  const res = await setSessionAttendance({
    orgId: user.orgId,
    programId: session.programId,
    sessionId: session.id,
    markedBy: user.id,
    entries: parsed.data.entries,
    base: parsed.data.base,
    force: parsed.data.force,
  });
  if (!res.ok) return res;

  // Token rewards for attending (once per session per learner).
  for (const c of res.changes) {
    if (c.to === 'present' || c.to === 'late') {
      await reward(user.orgId, c.studentId, c.to === 'present' ? 'attendancePresent' : 'attendanceLate', session.id, `Attended “${session.title}”`, 'attendance');
    }
  }

  if (res.changes.length) {
    const tally = res.changes.reduce<Record<string, number>>((m, c) => ((m[c.to] = (m[c.to] ?? 0) + 1), m), {});
    await auditBy(
      user,
      'attendance.update',
      `${session.title}: ${Object.entries(tally)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ')}`,
      res.changes.map((c) => c.studentId).slice(0, 500),
      {
        sessionId: session.id,
        programId: session.programId,
        changes: res.changes.slice(0, 200).map((c) => ({ s: c.studentId, from: c.from, to: c.to })),
        overwrote: parsed.data.force === true,
      }
    );
  }

  revalidatePath(`/sessions/${session.id}`);
  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  return { ok: true, count: res.count };
}