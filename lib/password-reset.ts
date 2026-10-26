// =============================================================================
// FILE: lib/password-reset.ts   (NEW FILE — server only)
// "Forgot password" by email.
//   - The answer is always the same, whether or not the email exists
//     (no account discovery).
//   - Rate-limited per IP and per email.
//   - Token: 32 random bytes, only its hash is stored, 30-minute expiry,
//     single use (atomic), older unused links are cancelled.
//   - After a reset every session is signed out (sessionVersion + 1).
//     Two-step sign-in stays on.
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import User from '@/models/User';
import PasswordReset from '@/models/PasswordReset';
import { hit } from './rate-limit';
import { sendEmail } from './email';
import { audit } from './audit';
import { requestInfo } from './request-info';
import { invalidateAuthState } from './auth-state';
import { validatePassword, PASSWORD_MAX } from './password';
import { getSettings } from './settings';
import { notify } from './notifications';
import { BCRYPT_COST } from './users';

const TTL_MIN = 30;
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase().slice(0, 200);
  const { ip, userAgent } = await requestInfo();
  const [byIp, byEmail] = await Promise.all([hit(`pwreset-ip:${ip || 'unknown'}`, 3600), hit(`pwreset-em:${sha(email)}`, 3600)]);
  if (byIp > 10 || byEmail > 3) return; // silently — same answer either way
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  await db();
  const users = (await User.find({ email, status: 'active' }).select('_id orgId name email').limit(5).lean()) as { _id: unknown; orgId: unknown; name: string; email: string }[];
  for (const u of users) {
    await PasswordReset.updateMany({ userId: u._id, usedAt: null }, { $set: { usedAt: new Date() } });
    const token = crypto.randomBytes(32).toString('base64url');
    await PasswordReset.create({ orgId: u.orgId, userId: u._id, tokenHash: sha(token), expiresAt: new Date(Date.now() + TTL_MIN * 60_000), ip });
    await sendEmail({
      to: u.email,
      subject: 'Reset your password',
      heading: 'Reset your password',
      body: `Hi ${u.name.split(' ')[0] || 'there'},\n\nSomeone (hopefully you) asked to reset your password. The link works once, for ${TTL_MIN} minutes.\n\nIf this wasn't you, ignore this email — your password stays the same.`,
      link: `/reset-password?token=${token}`,
      ctaLabel: 'Choose a new password',
    });
    await audit({ orgId: String(u.orgId), action: 'auth.password_reset_requested', targetIds: [String(u._id)], summary: email, ip, userAgent });
  }
}

export async function checkResetToken(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  await db();
  return !!(await PasswordReset.exists({ tokenHash: sha(token), usedAt: null, expiresAt: { $gt: new Date() } }));
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || token.length > 100) return { ok: false, error: 'This link is not valid.' };
  const { ip } = await requestInfo();
  if ((await hit(`pwreset-use:${ip || 'unknown'}`, 900)) > 20) return { ok: false, error: 'Too many attempts. Please wait 15 minutes.' };
  await db();
  const pending = (await PasswordReset.findOne({ tokenHash: sha(token), usedAt: null, expiresAt: { $gt: new Date() } }).lean()) as { _id: unknown; userId: unknown; orgId: unknown } | null;
  if (!pending) return { ok: false, error: 'This link has expired or was already used. Ask for a new one.' };
  const user = (await User.findOne({ _id: pending.userId, orgId: pending.orgId, status: 'active' }).select('name email').lean()) as { name: string; email: string } | null;
  if (!user) return { ok: false, error: 'This account cannot be reset. Contact your admin.' };
  const s = await getSettings();
  if (password.length < s.passwordMinLength) return { ok: false, error: `Password must be at least ${s.passwordMinLength} characters` };
  if (password.length > PASSWORD_MAX) return { ok: false, error: `Password must be ${PASSWORD_MAX} characters or fewer` };
  const weak = validatePassword(password, { email: user.email, name: user.name });
  if (weak) return { ok: false, error: weak };

  // Single use — only the first request wins.
  const claimed = await PasswordReset.findOneAndUpdate({ _id: pending._id, usedAt: null }, { $set: { usedAt: new Date() } });
  if (!claimed) return { ok: false, error: 'This link was already used.' };

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await User.updateOne({ _id: pending.userId, orgId: pending.orgId }, { $set: { passwordHash, passwordChangedAt: new Date() }, $inc: { sessionVersion: 1 } });
  await invalidateAuthState([String(pending.userId)]);
  await audit({ orgId: String(pending.orgId), action: 'auth.password_reset_done', actorId: String(pending.userId), actorEmail: user.email, actorName: user.name, targetIds: [String(pending.userId)], ip });
  await notify({ orgId: String(pending.orgId), userId: String(pending.userId), type: 'security.signin', title: 'Your password was changed', body: 'Your password was reset with an email link and every device was signed out. If this wasn’t you, contact your admin straight away.', email: true });
  return { ok: true };
}
