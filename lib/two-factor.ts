// =============================================================================
// FILE: lib/two-factor.ts   (NEW FILE — server only)
// Two-step sign-in (authenticator app + one-time recovery codes).
//
// Safety & availability
//   - Off for everyone until each person turns it on (policy "optional").
//   - Admin policy can REQUIRE it for admins / staff / everyone: those users
//     are sent to Profile → Security to set it up (they are never locked out).
//   - 10 recovery codes per user; a royal admin can reset a user's 2FA.
//   - Emergency switch: AUTH_2FA=off in the environment skips the code check
//     at sign-in (e.g. if many people lose their phones). Redeploy to apply.
//   - Codes can't be re-used (last accepted time-step is stored atomically).
// =============================================================================

import 'server-only';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { db } from './db';
import User from '@/models/User';
import { seal, open } from './secret-box';
import {
  newSecret,
  verifyTotp,
  otpauthUrl,
  newRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from './totp';
import { invalidateAuthState } from './auth-state';
import type { Role } from './constants';
import type { TwoFactorPolicy } from './theme-config';

const SETUP_MINUTES = 15;

/** AUTH_2FA=off → codes are not asked at sign-in (emergency only). */
export function twoFactorDisabledByEnv(): boolean {
  return (process.env.AUTH_2FA ?? 'on').toLowerCase() === 'off';
}

/** Does the organisation policy require 2FA for this role? */
export function policyRequires(policy: TwoFactorPolicy | undefined, role: Role): boolean {
  if (twoFactorDisabledByEnv()) return false;
  switch (policy) {
    case 'all':
      return true;
    case 'staff':
      return role === 'admin' || role === 'mentor';
    case 'admins':
      return role === 'admin';
    default:
      return false;
  }
}

type Ok<T = object> = { ok: true } & T;
type Err = { ok: false; error: string };

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function beginSetup(
  orgId: string,
  userId: string,
  issuer: string
): Promise<Ok<{ secret: string; qrSvg: string; otpauth: string }> | Err> {
  await db();
  const u = (await User.findOne({ _id: userId, orgId }).select('email twoFactorEnabled').lean()) as
    | { email: string; twoFactorEnabled?: boolean }
    | null;
  if (!u) return { ok: false, error: 'User not found' };
  if (u.twoFactorEnabled) return { ok: false, error: 'Two-step sign-in is already on.' };

  const secret = newSecret();
  const pending = seal({ s: secret, exp: Date.now() + SETUP_MINUTES * 60_000 });
  await User.updateOne({ _id: userId, orgId }, { $set: { twoFactorPending: pending } });

  const otpauth = otpauthUrl(secret, u.email, issuer.replace(/:/g, '').slice(0, 40) || 'Nibras');
  const qrSvg = await QRCode.toString(otpauth, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', width: 220 });
  return { ok: true, secret, qrSvg, otpauth };
}

export async function confirmSetup(
  orgId: string,
  userId: string,
  code: string
): Promise<Ok<{ recoveryCodes: string[] }> | Err> {
  await db();
  const u = (await User.findOne({ _id: userId, orgId }).select('+twoFactorPending twoFactorEnabled').lean()) as
    | { twoFactorPending?: string; twoFactorEnabled?: boolean }
    | null;
  if (!u?.twoFactorPending) return { ok: false, error: 'Setup expired — start again.' };
  let pending: { s: string; exp: number };
  try {
    pending = open<{ s: string; exp: number }>(u.twoFactorPending);
  } catch {
    return { ok: false, error: 'Setup expired — start again.' };
  }
  if (Date.now() > pending.exp) return { ok: false, error: 'Setup expired — start again.' };
  const step = verifyTotp(pending.s, code);
  if (step === null) return { ok: false, error: 'That code is not right. Check the time on your phone and try the newest code.' };

  const codes = newRecoveryCodes();
  await User.updateOne(
    { _id: userId, orgId },
    {
      $set: {
        twoFactorEnabled: true,
        twoFactorSecret: seal(pending.s),
        twoFactorRecovery: codes.map(hashRecoveryCode),
        twoFactorLastStep: step,
        twoFactorEnabledAt: new Date(),
      },
      $unset: { twoFactorPending: 1 },
    }
  );
  await invalidateAuthState([userId]);
  return { ok: true, recoveryCodes: codes };
}

// ---------------------------------------------------------------------------
// Verify (sign-in and sensitive actions)
// ---------------------------------------------------------------------------

export type SecondFactorResult = 'ok' | 'recovery' | 'invalid';

/**
 * Checks a 6-digit authenticator code OR a recovery code.
 * Recovery codes are single-use; authenticator codes can't be replayed.
 */
export async function verifySecondFactor(userId: string, rawCode: string): Promise<SecondFactorResult> {
  await db();
  const u = (await User.findById(userId).select('+twoFactorSecret +twoFactorRecovery +twoFactorLastStep twoFactorEnabled').lean()) as
    | { twoFactorSecret?: string; twoFactorRecovery?: string[]; twoFactorLastStep?: number; twoFactorEnabled?: boolean }
    | null;
  if (!u?.twoFactorEnabled || !u.twoFactorSecret) return 'invalid';
  const code = (rawCode ?? '').trim();

  if (/^\d{3}\s?\d{3}$/.test(code)) {
    let secret: string;
    try {
      secret = open<string>(u.twoFactorSecret);
    } catch {
      return 'invalid';
    }
    const step = verifyTotp(secret, code);
    if (step === null) return 'invalid';
    // Atomic: only succeeds if this step is newer than the last one used.
    const r = await User.updateOne(
      { _id: userId, $or: [{ twoFactorLastStep: { $lt: step } }, { twoFactorLastStep: { $exists: false } }] },
      { $set: { twoFactorLastStep: step } }
    );
    return r.modifiedCount === 1 ? 'ok' : 'invalid';
  }

  if (normalizeRecoveryCode(code)) {
    const h = hashRecoveryCode(code);
    const r = await User.updateOne({ _id: userId, twoFactorRecovery: h }, { $pull: { twoFactorRecovery: h } });
    return r.modifiedCount === 1 ? 'recovery' : 'invalid';
  }
  return 'invalid';
}

// ---------------------------------------------------------------------------
// Turn off / new recovery codes / admin reset
// ---------------------------------------------------------------------------

export async function disableTwoFactor(orgId: string, userId: string, password: string, code: string): Promise<Ok | Err> {
  await db();
  const u = (await User.findOne({ _id: userId, orgId }).select('+passwordHash twoFactorEnabled').lean()) as
    | { passwordHash?: string; twoFactorEnabled?: boolean }
    | null;
  if (!u?.passwordHash) return { ok: false, error: 'User not found' };
  if (!u.twoFactorEnabled) return { ok: true };
  if (!(await bcrypt.compare(password ?? '', u.passwordHash))) return { ok: false, error: 'Password is incorrect.' };
  const v = await verifySecondFactor(userId, code);
  if (v === 'invalid') return { ok: false, error: 'Code is incorrect.' };
  await clearTwoFactor(orgId, userId);
  return { ok: true };
}

export async function regenerateRecoveryCodes(orgId: string, userId: string, code: string): Promise<Ok<{ recoveryCodes: string[] }> | Err> {
  const v = await verifySecondFactor(userId, code);
  if (v === 'invalid') return { ok: false, error: 'Code is incorrect.' };
  const codes = newRecoveryCodes();
  await db();
  await User.updateOne({ _id: userId, orgId }, { $set: { twoFactorRecovery: codes.map(hashRecoveryCode) } });
  return { ok: true, recoveryCodes: codes };
}

/** Removes 2FA from an account (own "turn off", or royal admin reset). */
export async function clearTwoFactor(orgId: string, userId: string): Promise<void> {
  await db();
  await User.updateOne(
    { _id: userId, orgId },
    {
      $set: { twoFactorEnabled: false },
      $unset: { twoFactorSecret: 1, twoFactorRecovery: 1, twoFactorPending: 1, twoFactorLastStep: 1, twoFactorEnabledAt: 1 },
    }
  );
  await invalidateAuthState([userId]);
}

export type TwoFactorStatus = { enabled: boolean; enabledAt: string | null; recoveryLeft: number };

export async function twoFactorStatus(orgId: string, userId: string): Promise<TwoFactorStatus> {
  await db();
  const u = (await User.findOne({ _id: userId, orgId }).select('+twoFactorRecovery twoFactorEnabled twoFactorEnabledAt').lean()) as
    | { twoFactorEnabled?: boolean; twoFactorEnabledAt?: Date; twoFactorRecovery?: string[] }
    | null;
  return {
    enabled: u?.twoFactorEnabled === true,
    enabledAt: u?.twoFactorEnabledAt ? new Date(u.twoFactorEnabledAt).toISOString() : null,
    recoveryLeft: u?.twoFactorRecovery?.length ?? 0,
  };
}

/** Adoption by role (security dashboard). */
export async function twoFactorStats(orgId: string): Promise<{ role: Role; total: number; enabled: number }[]> {
  await db();
  const rows = (await User.aggregate([
    { $match: { orgId: new (await import('mongoose')).Types.ObjectId(orgId), status: { $ne: 'disabled' } } },
    { $group: { _id: '$role', total: { $sum: 1 }, enabled: { $sum: { $cond: [{ $eq: ['$twoFactorEnabled', true] }, 1, 0] } } } },
  ])) as { _id: Role; total: number; enabled: number }[];
  const order: Role[] = ['admin', 'mentor', 'student'];
  return order.map((role) => {
    const r = rows.find((x) => x._id === role);
    return { role, total: r?.total ?? 0, enabled: r?.enabled ?? 0 };
  });
}
