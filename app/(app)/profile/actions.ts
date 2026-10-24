'use server';

// =============================================================================
// FILE: app/(app)/profile/actions.ts
// Profile: name, avatar, password, personal theme.
// NEW: shared password policy; changing your password signs you out on every
// device (the form then signs you out here too and shows a message on the
// login page); password changes are audited; personal theme preset.
// =============================================================================

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { updateUser, setThemePreset } from '@/lib/users';
import { db } from '@/lib/db';
import User from '@/models/User';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/password';
import { getSettings } from '@/lib/settings';
import { findPreset } from '@/lib/theme-config';
import { audit } from '@/lib/audit';

const schema = z.object({
  name: z.string().min(1).max(80),
  avatar: z.string().max(500).optional().default(''),
  currentPassword: z.string().max(200).optional().default(''),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, `New password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX)
    .optional()
    .or(z.literal('')),
});

export type ProfileActionResult =
  | { ok: true; passwordChanged?: boolean }
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
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return { ok: false, error: 'The new password must be different from the current one' };
    }

    patch.password = parsed.data.newPassword;
  }

  const res = await updateUser(me.orgId, me.id, patch);
  if (!res.ok) return res;

  if (patch.password) {
    await audit({
      orgId: me.orgId,
      action: 'auth.password_changed',
      actorId: me.id,
      actorEmail: me.email ?? '',
      actorName: me.name ?? '',
      targetIds: [me.id],
      summary: 'Signed out on all devices',
    });
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true, passwordChanged: !!patch.password };
}

/** Personal theme. '' = follow the organisation theme. */
export async function saveThemeAction(raw: unknown): Promise<ProfileActionResult> {
  const me = await requireAuth();
  const parsed = z.object({ presetId: z.string().max(60) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid theme' };
  const s = await getSettings();
  if (!s.allowUserThemes) return { ok: false, error: 'Personal themes are turned off by your admin.' };
  const id = parsed.data.presetId;
  if (id && !findPreset(id)) return { ok: false, error: 'Unknown theme' };
  const res = await setThemePreset(me.orgId, me.id, id);
  if (!res.ok) return res;
  revalidatePath('/', 'layout');
  return { ok: true };
}
