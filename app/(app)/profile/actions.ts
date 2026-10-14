'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { updateUser } from '@/lib/users';
import { db } from '@/lib/db';
import User from '@/models/User';

const schema = z.object({
  name: z.string().min(1).max(80),
  avatar: z.string().max(500).optional().default(''),
  currentPassword: z.string().optional().default(''),
  newPassword: z.string().min(6).max(100).optional().or(z.literal('')),
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

  const patch: { name?: string; avatar?: string; password?: string } = {
    name: parsed.data.name,
    avatar: parsed.data.avatar,
  };

  if (parsed.data.newPassword) {
    // Require current password when changing password
    if (!parsed.data.currentPassword) {
      return { ok: false, error: 'Enter your current password to change it' };
    }

    await db();
    const doc = await User.findOne({ _id: me.id, orgId: me.orgId })
      .select('+passwordHash')
      .lean();
    if (!doc?.passwordHash) {
      return { ok: false, error: 'User not found' };
    }

    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      doc.passwordHash as string
    );
    if (!ok) {
      return { ok: false, error: 'Current password is incorrect' };
    }

    patch.password = parsed.data.newPassword;
  }

  const res = await updateUser(me.orgId, me.id, patch);
  if (!res.ok) return res;

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}