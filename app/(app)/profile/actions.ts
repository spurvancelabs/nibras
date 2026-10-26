'use server';

// =============================================================================
// FILE: app/(app)/profile/actions.ts
// Profile: name & photo, password, personal theme + design style, and
// two-step sign-in (set up, recovery codes, turn off).
//  - Changing your password signs you out on every device (the form then
//    signs you out here too and the login page shows a message).
//  - Password rules: shared policy + "minimum length" from Settings → Security.
//  - Two-step actions are rate-limited (10 tries / 10 minutes) and audited.
//  - All actions work even while 2FA setup is required (allowWithout2fa).
// =============================================================================

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { updateUser, setThemePreset, setUiStyle } from '@/lib/users';
import { db } from '@/lib/db';
import User from '@/models/User';
import { PASSWORD_MAX, validatePassword } from '@/lib/password';
import { getSettings } from '@/lib/settings';
import { findPreset } from '@/lib/theme-config';
import { findUiStyle } from '@/lib/ui-styles';
import { themeTier, styleTier, canUseTier } from '@/lib/entitlements';
import { policyFrom } from '@/lib/premium';
import { audit } from '@/lib/audit';
import { invalidateAuthState } from '@/lib/auth-state';
import { hit } from '@/lib/rate-limit';
import {
  beginSetup,
  confirmSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  policyRequires,
} from '@/lib/two-factor';

export type ProfileActionResult = { ok: true; passwordChanged?: boolean } | { ok: false; error: string; premiumRequired?: boolean };

/** Error code the appearance pickers turn into the "Upgrade" dialog. */
const PREMIUM_REQUIRED = 'This is a Premium theme. Upgrade to use it.';

const me = () => requireAuth({ allowWithout2fa: true });

// ---------------------------------------------------------------------------
// Name & photo
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  avatar: z
    .string()
    .max(500)
    .refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'Photo must be an uploaded image')
    .optional()
    .default(''),
});

export async function saveAccountAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await me();
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const res = await updateUser(user.orgId, user.id, { name: parsed.data.name, avatar: parsed.data.avatar });
  if (!res.ok) return res;
  await invalidateAuthState([user.id]);
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: z.string().max(PASSWORD_MAX),
});

export async function changePasswordAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await me();
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const n = await hit(`pw-change:${user.id}`, 600);
  if (n > 10) return { ok: false, error: 'Too many attempts. Please wait 10 minutes.' };

  const settings = await getSettings();
  const { currentPassword, newPassword } = parsed.data;
  if (newPassword.length < settings.passwordMinLength) {
    return { ok: false, error: `New password must be at least ${settings.passwordMinLength} characters` };
  }
  const policyErr = validatePassword(newPassword, { email: user.email ?? '', name: user.name ?? '' });
  if (policyErr) return { ok: false, error: policyErr };

  await db();
  const doc = (await User.findOne({ _id: user.id, orgId: user.orgId }).select('+passwordHash').lean()) as { passwordHash?: string } | null;
  if (!doc?.passwordHash) return { ok: false, error: 'User not found' };
  if (!(await bcrypt.compare(currentPassword, doc.passwordHash))) return { ok: false, error: 'Current password is incorrect' };
  if (currentPassword === newPassword) return { ok: false, error: 'The new password must be different from the current one' };

  const res = await updateUser(user.orgId, user.id, { password: newPassword });
  if (!res.ok) return res;
  await audit({
    orgId: user.orgId,
    action: 'auth.password_changed',
    actorId: user.id,
    actorEmail: user.email ?? '',
    actorName: user.name ?? '',
    targetIds: [user.id],
    summary: 'Signed out on all devices',
  });
  return { ok: true, passwordChanged: true };
}

/** @deprecated kept for older forms — use saveAccountAction / changePasswordAction. */
export async function saveProfileAction(raw: unknown): Promise<ProfileActionResult> {
  const r = z
    .object({ name: z.string(), avatar: z.string().optional().default(''), currentPassword: z.string().optional().default(''), newPassword: z.string().optional().default('') })
    .safeParse(raw);
  if (!r.success) return { ok: false, error: 'Invalid input' };
  const a = await saveAccountAction({ name: r.data.name, avatar: r.data.avatar });
  if (!a.ok || !r.data.newPassword) return a;
  return changePasswordAction({ currentPassword: r.data.currentPassword, newPassword: r.data.newPassword });
}

// ---------------------------------------------------------------------------
// Personal appearance
// ---------------------------------------------------------------------------

/** Personal colour theme. '' = follow the organisation theme. */
export async function saveThemeAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await me();
  const parsed = z.object({ presetId: z.string().max(60) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid theme' };
  const s = await getSettings();
  if (!s.allowUserThemes) return { ok: false, error: 'Personal themes are turned off by your admin.' };
  const id = parsed.data.presetId;
  const preset = id ? findPreset(id) : undefined;
  if (id && !preset) return { ok: false, error: 'Unknown theme' };
  // Premium themes: checked on the server (the picker lock is only a hint).
  if (preset && !canUseTier(themeTier(preset, policyFrom(s)), user, policyFrom(s))) {
    return { ok: false, error: PREMIUM_REQUIRED, premiumRequired: true };
  }
  const res = await setThemePreset(user.orgId, user.id, id);
  if (!res.ok) return res;
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Personal design style. '' = follow the organisation style. */
export async function saveStyleAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await me();
  const parsed = z.object({ styleId: z.string().max(60) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid style' };
  const s = await getSettings();
  if (!s.allowUserStyles) return { ok: false, error: 'Personal styles are turned off by your admin.' };
  const id = parsed.data.styleId;
  const style = id ? findUiStyle(id) : undefined;
  if (id && !style) return { ok: false, error: 'Unknown style' };
  if (style && !canUseTier(styleTier(style, policyFrom(s)), user, policyFrom(s))) {
    return { ok: false, error: 'This is a Premium design style. Upgrade to use it.', premiumRequired: true };
  }
  const res = await setUiStyle(user.orgId, user.id, id);
  if (!res.ok) return res;
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Two-step sign-in
// ---------------------------------------------------------------------------

async function limit2fa(userId: string): Promise<string | null> {
  const n = await hit(`tfa:${userId}`, 600);
  return n > 10 ? 'Too many attempts. Please wait 10 minutes and try again.' : null;
}

export async function begin2faAction(): Promise<{ ok: true; secret: string; qrSvg: string; otpauth: string } | { ok: false; error: string }> {
  const user = await me();
  const s = await getSettings();
  if (s.twoFactorPolicy === 'off' && !policyRequires(s.twoFactorPolicy, user.role)) {
    return { ok: false, error: 'Two-step sign-in is switched off by your admin.' };
  }
  return beginSetup(user.orgId, user.id, s.orgName || 'Nibras');
}

export async function confirm2faAction(raw: unknown): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const user = await me();
  const parsed = z.object({ code: z.string().trim().max(12) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Enter the 6-digit code' };
  const limited = await limit2fa(user.id);
  if (limited) return { ok: false, error: limited };
  const res = await confirmSetup(user.orgId, user.id, parsed.data.code);
  if (res.ok) {
    await audit({ orgId: user.orgId, action: 'auth.2fa_enabled', actorId: user.id, actorEmail: user.email ?? '', actorName: user.name ?? '', targetIds: [user.id] });
    revalidatePath('/', 'layout');
  }
  return res;
}

export async function disable2faAction(raw: unknown): Promise<ProfileActionResult> {
  const user = await me();
  const parsed = z.object({ password: z.string().min(1, 'Enter your password').max(200), code: z.string().trim().min(6, 'Enter a code').max(12) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const s = await getSettings();
  if (policyRequires(s.twoFactorPolicy, user.role)) {
    return { ok: false, error: 'Your admin requires two-step sign-in for your account, so it can’t be turned off.' };
  }
  const limited = await limit2fa(user.id);
  if (limited) return { ok: false, error: limited };
  const res = await disableTwoFactor(user.orgId, user.id, parsed.data.password, parsed.data.code);
  if (res.ok) {
    await audit({ orgId: user.orgId, action: 'auth.2fa_disabled', actorId: user.id, actorEmail: user.email ?? '', actorName: user.name ?? '', targetIds: [user.id] });
    revalidatePath('/', 'layout');
  }
  return res;
}

export async function regenerateRecoveryAction(raw: unknown): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const user = await me();
  const parsed = z.object({ code: z.string().trim().min(6).max(12) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Enter the 6-digit code from your app' };
  const limited = await limit2fa(user.id);
  if (limited) return { ok: false, error: limited };
  const res = await regenerateRecoveryCodes(user.orgId, user.id, parsed.data.code);
  if (res.ok) {
    await audit({ orgId: user.orgId, action: 'auth.recovery_regenerated', actorId: user.id, actorEmail: user.email ?? '', actorName: user.name ?? '', targetIds: [user.id] });
  }
  return res;
}

// ---------------------------------------------------------------------------
// Sign out of every device (including this one)
// ---------------------------------------------------------------------------

export async function signOutEverywhereAction(): Promise<ProfileActionResult> {
  const user = await me();
  await db();
  await User.updateOne({ _id: user.id, orgId: user.orgId }, { $inc: { sessionVersion: 1 } });
  await invalidateAuthState([user.id]);
  await audit({
    orgId: user.orgId,
    action: 'auth.signout_everywhere',
    actorId: user.id,
    actorEmail: user.email ?? '',
    actorName: user.name ?? '',
    targetIds: [user.id],
    summary: 'Signed out of all devices',
  });
  return { ok: true };
}
