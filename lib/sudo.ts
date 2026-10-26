// =============================================================================
// FILE: lib/sudo.ts   (NEW FILE — server only)
// Re-authentication ("sudo mode") for high-impact actions such as running
// account automation live, signing everyone out, granting Super Admin,
// changing premium policy or bulk-suspending accounts.
//
// After the user re-enters their password (and 2FA code if they use 2FA) we
// set a short-lived, HMAC-signed, httpOnly cookie bound to their user id and
// session version. Actions call requireRecentAuth(); if it fails they return
// REAUTH_REQUIRED and the UI shows the confirm-identity dialog, then retries.
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { REAUTH_REQUIRED } from './reauth-shared';

export { REAUTH_REQUIRED };

const COOKIE = 'lms_sudo';
export const SUDO_MINUTES = 10;

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return crypto.createHash('sha256').update(`nibras-sudo:v1:${secret}`).digest();
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', key()).update(payload).digest('base64url');
}

/** Mark this browser as recently re-authenticated for `userId`. */
export async function grantSudo(userId: string, sv: number): Promise<void> {
  const exp = Date.now() + SUDO_MINUTES * 60_000;
  const payload = `${userId}.${sv}.${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SUDO_MINUTES * 60,
  });
}

/** True if the user re-authenticated in the last SUDO_MINUTES on this browser. */
export async function hasRecentAuth(userId: string, sv: number): Promise<boolean> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value ?? '';
    const parts = raw.split('.');
    if (parts.length !== 4) return false;
    const [uid, s, exp, mac] = parts;
    const expected = sign(`${uid}.${s}.${exp}`);
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
    return uid === userId && Number(s) === sv && Number(exp) > Date.now();
  } catch {
    return false;
  }
}

export async function clearSudo(): Promise<void> {
  try {
    (await cookies()).delete(COOKIE);
  } catch {
    /* ignore */
  }
}

/**
 * For server actions doing something high-impact: true when the signed-in
 * user confirmed their identity in the last SUDO_MINUTES. If false, return
 * `{ ok: false, error: REAUTH_REQUIRED }` and the client will prompt.
 * Fails CLOSED (a DB error means "please confirm again").
 */
export async function requireRecentAuth(user: { id: string; orgId: string }): Promise<boolean> {
  try {
    const [{ db }, { default: User }] = await Promise.all([import('./db'), import('@/models/User')]);
    await db();
    const u = (await User.findOne({ _id: user.id, orgId: user.orgId }).select('sessionVersion').lean()) as { sessionVersion?: number } | null;
    if (!u) return false;
    return hasRecentAuth(user.id, Number(u.sessionVersion ?? 0) || 0);
  } catch {
    return false;
  }
}
