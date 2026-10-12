'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-helpers';
import {
  createUser,
  updateUser,
  setUserPrograms,
} from '@/lib/users';
import { ROLES } from '@/models/User';

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(ROLES),
  avatar: z.string().max(500).optional().default(''),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  avatar: z.string().max(500).optional(),
  password: z.string().min(6).max(100).optional(),
});

const programsSchema = z.object({
  id: z.string().min(1),
  programIds: z.array(z.string()).default([]),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createUserAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await createUser({ orgId: admin.orgId, ...parsed.data });
  if (!res.ok) return res;

  revalidatePath('/admin/users');
  return { ok: true, id: res.id };
}

export async function updateUserAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { id, ...patch } = parsed.data;
  const res = await updateUser(admin.orgId, id, patch);
  if (!res.ok) return res;

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
  return { ok: true };
}

export async function setUserProgramsAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = programsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await setUserPrograms(
    admin.orgId,
    parsed.data.id,
    parsed.data.programIds
  );
  if (!res.ok) return res;

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${parsed.data.id}`);
  revalidatePath('/admin/programs');
  return { ok: true };
}