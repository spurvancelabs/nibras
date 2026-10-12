'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { updateUser } from '@/lib/users';

const schema = z.object({
  name: z.string().min(1).max(80),
  avatar: z.string().max(500).optional().default(''),
  password: z.string().min(6).max(100).optional().or(z.literal('')),
});

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveProfileAction(raw: unknown): Promise<ProfileActionResult> {
  const me = await requireAuth();

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  // Own profile only — never pass role/status here.
  const patch: {
    name?: string;
    avatar?: string;
    password?: string;
  } = { name: parsed.data.name, avatar: parsed.data.avatar };

  if (parsed.data.password) patch.password = parsed.data.password;

  const res = await updateUser(me.orgId, me.id, patch);
  if (!res.ok) return res;

  revalidatePath('/profile');
  revalidatePath('/dashboard');

  return { ok: true };
}