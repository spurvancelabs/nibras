// =============================================================================
// FILE: lib/registration.ts   (NEW FILE — server only)
// Self-registration on /register (switched on by the Super Admin).
//
//   mode 'open'      the account works as soon as the email is confirmed
//                    (or right away when email confirmation is off)
//   mode 'approval'  an admin approves it in Users → "Awaiting approval"
//
// Safety: only learners can sign up (never mentors/admins) · allowed email
// domains · per-IP and per-email rate limits · hidden honeypot field ·
// password policy · single-use hashed email links · audited · admins told.
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';
import Program from '@/models/Program';
import Organization from '@/models/Organization';
import EmailVerification from '@/models/EmailVerification';
import { getSettings } from './settings';
import { hit } from './rate-limit';
import { requestInfo } from './request-info';
import { validatePassword, PASSWORD_MAX } from './password';
import { BCRYPT_COST, cleanName } from './users';
import { sendEmail } from './email';
import { audit } from './audit';
import { notifyMany } from './notifications';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function emailDomainAllowed(email: string, domains: string): boolean {
  const list = domains
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  if (!list.length) return true;
  const dom = email.split('@')[1]?.toLowerCase() ?? '';
  return list.some((d) => dom === d || dom.endsWith(`.${d}`));
}

export async function countPending(orgId: string): Promise<number> {
  await db();
  return User.countDocuments({ orgId, status: 'pending' });
}

async function targetOrg(programId: string): Promise<{ orgId: unknown; programId: unknown | null } | null> {
  if (programId && Types.ObjectId.isValid(programId)) {
    const p = (await Program.findOne({ _id: programId, status: { $ne: 'archived' } }).select('orgId').lean()) as { _id: unknown; orgId: unknown } | null;
    if (p) return { orgId: p.orgId, programId: p._id };
  }
  const org = (await Organization.findOne({ status: { $ne: 'suspended' } }).sort({ createdAt: 1 }).select('_id').lean()) as { _id: unknown } | null;
  return org ? { orgId: org._id, programId: null } : null;
}

export type RegisterResult = { ok: true; next: 'signin' | 'check-email' | 'wait-approval' } | { ok: false; error: string };

export async function register(input: { name: string; email: string; password: string; website?: string }): Promise<RegisterResult> {
  const s = await getSettings();
  if (!s.registrationEnabled) return { ok: false, error: 'Sign-up is closed. Ask your organisation for an account.' };
  const { ip, userAgent } = await requestInfo();
  // Honeypot: bots fill hidden fields. Pretend it worked.
  if (input.website) return { ok: true, next: 'check-email' };
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const name = cleanName(input.name);
  if ((await hit(`register-ip:${ip || 'unknown'}`, 3600)) > 8) return { ok: false, error: 'Too many sign-ups from this network. Please try again later.' };
  if ((await hit(`register-em:${sha(email)}`, 86400)) > 3) return { ok: false, error: 'Too many attempts for this email. Please try again tomorrow.' };
  if (!name) return { ok: false, error: 'Enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (!emailDomainAllowed(email, s.registrationDomains)) return { ok: false, error: 'Sign-up is only open to approved email addresses for this organisation.' };
  if (input.password.length < s.passwordMinLength) return { ok: false, error: `Password must be at least ${s.passwordMinLength} characters.` };
  if (input.password.length > PASSWORD_MAX) return { ok: false, error: `Password must be ${PASSWORD_MAX} characters or fewer.` };
  const weak = validatePassword(input.password, { email, name });
  if (weak) return { ok: false, error: weak };

  await db();
  const target = await targetOrg(s.registrationProgramId);
  if (!target) return { ok: false, error: 'Sign-up is not available right now.' };

  const verify = s.registrationVerifyEmail && !!process.env.RESEND_API_KEY;
  if (await User.exists({ orgId: target.orgId, email })) {
    // Don't reveal more than needed: same wording as a fresh verification sign-up.
    if (verify) return { ok: true, next: 'check-email' };
    return { ok: false, error: 'An account with this email may already exist. Try signing in, or use "Forgot password".' };
  }

  const active = s.registrationMode === 'open' && !verify;
  const user = await User.create({
    orgId: target.orgId,
    name,
    email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    role: 'student',
    status: active ? 'active' : 'pending',
    programIds: target.programId ? [target.programId] : [],
    registrationSource: 'self',
    passwordChangedAt: new Date(),
  });
  if (target.programId) await Program.updateOne({ _id: target.programId }, { $addToSet: { students: user._id } });
  await audit({ orgId: String(target.orgId), action: 'user.create', actorId: String(user._id), actorEmail: email, actorName: name, targetIds: [String(user._id)], summary: `Self-registration (${s.registrationMode}${verify ? ', email check' : ''})`, ip, userAgent });

  if (verify) {
    await sendVerification(String(target.orgId), String(user._id), name, email);
    return { ok: true, next: 'check-email' };
  }
  if (!active) {
    await tellAdmins(String(target.orgId), name, email);
    return { ok: true, next: 'wait-approval' };
  }
  return { ok: true, next: 'signin' };
}

async function sendVerification(orgId: string, userId: string, name: string, email: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  await EmailVerification.create({ orgId: new Types.ObjectId(orgId), userId: new Types.ObjectId(userId), tokenHash: sha(token), expiresAt: new Date(Date.now() + 24 * 3600_000) });
  await sendEmail({
    to: email,
    subject: 'Confirm your email',
    heading: `Welcome, ${name.split(' ')[0]}!`,
    body: 'Please confirm your email address to finish signing up. The link works once, for 24 hours.\n\nIf you did not sign up, ignore this email.',
    link: `/verify-email?token=${token}`,
    ctaLabel: 'Confirm my email',
  });
}

async function tellAdmins(orgId: string, name: string, email: string) {
  const admins = (await User.find({ orgId, role: 'admin', status: 'active' }).select('_id').limit(50).lean()) as { _id: unknown }[];
  await notifyMany({
    orgId,
    userIds: admins.map((a) => String(a._id)),
    type: 'system.alert',
    title: 'New sign-up waiting for approval',
    body: `${name} <${email}>`,
    link: '/admin/users?status=pending',
    dedupeKeyPrefix: `signup:${sha(email).slice(0, 12)}`,
  });
}

export type VerifyResult = { ok: true; next: 'signin' | 'wait-approval' } | { ok: false; error: string };

export async function verifyEmail(token: string): Promise<VerifyResult> {
  if (!token || token.length > 100) return { ok: false, error: 'This link is not valid.' };
  const { ip } = await requestInfo();
  if ((await hit(`verify-ip:${ip || 'unknown'}`, 900)) > 30) return { ok: false, error: 'Too many attempts. Please wait a few minutes.' };
  await db();
  const v = (await EmailVerification.findOneAndUpdate({ tokenHash: sha(token), usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }).lean()) as
    | { orgId: unknown; userId: unknown }
    | null;
  if (!v) return { ok: false, error: 'This link has expired or was already used.' };
  const s = await getSettings();
  const u = (await User.findOne({ _id: v.userId, orgId: v.orgId }).select('name email status').lean()) as { name: string; email: string; status: string } | null;
  if (!u) return { ok: false, error: 'Account not found.' };
  const activate = u.status === 'pending' && s.registrationMode === 'open';
  await User.updateOne({ _id: v.userId, orgId: v.orgId }, { $set: { emailVerifiedAt: new Date(), ...(activate ? { status: 'active' } : {}) } });
  if (u.status === 'active' || activate) return { ok: true, next: 'signin' };
  await tellAdmins(String(v.orgId), u.name, u.email);
  return { ok: true, next: 'wait-approval' };
}
