'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-helpers';
import {
  createProgram,
  updateProgram,
  deleteProgram,
  setProgramMembers,
} from '@/lib/programs';

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

const membersSchema = z.object({
  programId: z.string().min(1),
  role: z.enum(['mentor', 'student']),
  userIds: z.array(z.string()).default([]),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function saveProgramAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  if (parsed.data.id) {
    const res = await updateProgram(admin.orgId, parsed.data.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
    });
    if (!res.ok) return res;

    revalidatePath('/admin/programs');
    revalidatePath(`/admin/programs/${parsed.data.id}`);
    return { ok: true, id: parsed.data.id };
  }

  const res = await createProgram({
    orgId: admin.orgId,
    name: parsed.data.name,
    description: parsed.data.description,
    status: parsed.data.status,
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
    createdBy: admin.id,
  });
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  return { ok: true, id: res.id };
}

export async function deleteProgramAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const res = await deleteProgram(admin.orgId, parsed.data.id);
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function setMembersAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = membersSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await setProgramMembers(
    admin.orgId,
    parsed.data.programId,
    parsed.data.role,
    parsed.data.userIds
  );
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  revalidatePath(`/admin/programs/${parsed.data.programId}`);
  revalidatePath('/admin/users');
  return { ok: true };
}