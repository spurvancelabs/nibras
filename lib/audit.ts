// =============================================================================
// FILE: lib/audit.ts
// Security audit trail.
//  - Writing an entry NEVER throws (logging problems must not block users).
//  - Every entry is signed (HMAC-SHA256, key derived from AUTH_SECRET /
//    NEXTAUTH_SECRET). verifyAudit() recomputes the signature, so entries
//    edited directly in MongoDB show up as "tampered" on the Security page.
//  - Entries expire after ~13 months (TTL index on the model).
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import AuditLog from '@/models/AuditLog';
import { requestInfo } from './request-info';

export const AUDIT_LABELS = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Sign-in blocked (too many attempts)',
  'auth.logout': 'Signed out',
  'auth.password_changed': 'Changed own password',
  'auth.2fa_enabled': 'Two-step sign-in turned on',
  'auth.2fa_disabled': 'Two-step sign-in turned off',
  'auth.2fa_failed': 'Wrong two-step code',
  'auth.recovery_used': 'Recovery code used to sign in',
  'auth.recovery_regenerated': 'New recovery codes created',
  'auth.new_network': 'Sign-in from a new network',
  'security.2fa_reset': 'Two-step sign-in reset by admin',
  'security.access_denied': 'Access denied',
  'security.royal_granted': 'Royal admin granted',
  'security.royal_revoked': 'Royal admin removed',
  'security.emergency_signout': 'Emergency sign-out of everyone',
  'security.audit_export': 'Audit log exported',
  'user.create': 'User created',
  'user.update': 'User updated',
  'user.password_reset': 'Password reset by admin',
  'user.programs': 'Programs changed',
  'user.delete': 'Users deleted',
  'user.bulk_update': 'Bulk update',
  'user.sessions_revoked': 'Signed out everywhere',
  'user.member_ids_assigned': 'Member IDs assigned',
  'user.import': 'CSV import',
  'user.welcome_emails': 'Welcome emails',
  'settings.member_ids': 'Member ID settings',
  'settings.update': 'Settings changed',
  'program.create': 'Program created',
  'program.update': 'Program updated',
  'program.delete': 'Program deleted',
  'program.members': 'Program members changed',
  'syllabus.update': 'Syllabus updated',
  'session.delete': 'Session deleted',
  'assignment.delete': 'Assignment deleted',
  'grade.update': 'Grade changed',
  'quiz.create': 'Quiz created',
  'quiz.update': 'Quiz updated',
  'quiz.delete': 'Quiz deleted',
  'quiz.attempt_reset': 'Quiz attempt reset',
  'quiz.grade': 'Quiz answer graded',
  'certificate.issue': 'Certificates issued',
  'certificate.revoke': 'Certificate revoked',
} as const;

export type AuditAction = keyof typeof AUDIT_LABELS;

/** Groups for the filter menu on the audit page. */
export const AUDIT_GROUPS: { label: string; prefix: string }[] = [
  { label: 'Sign-in & access', prefix: 'auth.' },
  { label: 'Security', prefix: 'security.' },
  { label: 'Users', prefix: 'user.' },
  { label: 'Settings', prefix: 'settings.' },
  { label: 'Programs & syllabus', prefix: 'program.|syllabus.' },
  { label: 'Teaching (sessions, grades, quizzes)', prefix: 'session.|assignment.|grade.|quiz.' },
  { label: 'Certificates', prefix: 'certificate.' },
];

export type AuditEntry = {
  orgId: string;
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  actorName?: string;
  targetIds?: string[];
  summary?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

function oid(id: string | undefined) {
  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

function signingKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto.createHash('sha256').update(`nibras-audit:v1:${secret}`).digest();
}

/** JSON with sorted keys at every level, so the same data always signs the same. */
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
}

type Signable = {
  orgId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetIds: string[];
  summary: string;
  meta: unknown;
  ip: string;
  at: string;
};

function sign(e: Signable): string {
  const key = signingKey();
  if (!key) return '';
  return 'v1:' + crypto.createHmac('sha256', key).update(stable(e)).digest('hex');
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db();
    let { ip, userAgent } = entry;
    if (ip === undefined) {
      const info = await requestInfo();
      ip = info.ip;
      userAgent = userAgent ?? info.userAgent;
    }
    const at = new Date();
    // Normalise meta to plain JSON so what is stored is exactly what was signed.
    const meta = entry.meta === undefined ? undefined : JSON.parse(JSON.stringify(entry.meta));
    const targetIds = (entry.targetIds ?? []).filter((t) => !!oid(t)).slice(0, 500);
    const signable: Signable = {
      orgId: entry.orgId,
      actorId: oid(entry.actorId) ? String(entry.actorId) : '',
      actorEmail: entry.actorEmail ?? '',
      action: entry.action,
      targetIds,
      summary: (entry.summary ?? '').slice(0, 500),
      meta: meta ?? null,
      ip: ip ?? '',
      at: at.toISOString(),
    };
    await AuditLog.create({
      orgId: oid(entry.orgId),
      actorId: oid(entry.actorId),
      actorEmail: signable.actorEmail,
      actorName: entry.actorName ?? '',
      action: entry.action,
      targetIds: targetIds.map((t) => oid(t)),
      summary: signable.summary,
      meta,
      ip: signable.ip,
      userAgent: userAgent ?? '',
      at,
      sig: sign(signable),
    });
  } catch (e) {
    console.error('[audit] write failed:', e);
  }
}

/** Shorthand: audit an action done by the signed-in user. */
export function auditBy(
  user: { id: string; orgId: string; email?: string | null; name?: string | null },
  action: AuditAction,
  summary: string,
  targetIds: string[] = [],
  meta?: Record<string, unknown>
): Promise<void> {
  return audit({
    orgId: user.orgId,
    action,
    actorId: user.id,
    actorEmail: user.email ?? '',
    actorName: user.name ?? '',
    summary,
    targetIds,
    meta,
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export type Integrity = 'valid' | 'unsigned' | 'tampered';

export type AuditRow = {
  id: string;
  action: AuditAction;
  label: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  targetIds: string[];
  summary: string;
  meta: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
  at: string;
  integrity: Integrity;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function integrityOf(r: any): Integrity {
  if (!r.sig) return 'unsigned';
  const expected = sign({
    orgId: String(r.orgId),
    actorId: r.actorId ? String(r.actorId) : '',
    actorEmail: r.actorEmail ?? '',
    action: r.action,
    targetIds: (r.targetIds ?? []).map(String),
    summary: r.summary ?? '',
    meta: r.meta ?? null,
    ip: r.ip ?? '',
    at: new Date(r.at).toISOString(),
  });
  if (!expected) return 'unsigned';
  const a = Buffer.from(expected);
  const b = Buffer.from(String(r.sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? 'valid' : 'tampered';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(r: any): AuditRow {
  return {
    id: String(r._id),
    action: r.action as AuditAction,
    label: AUDIT_LABELS[r.action as AuditAction] ?? r.action,
    actorId: r.actorId ? String(r.actorId) : '',
    actorEmail: r.actorEmail ?? '',
    actorName: r.actorName ?? '',
    targetIds: (r.targetIds ?? []).map(String),
    summary: r.summary ?? '',
    meta: (r.meta as Record<string, unknown>) ?? null,
    ip: r.ip ?? '',
    userAgent: r.userAgent ?? '',
    at: new Date(r.at).toISOString(),
    integrity: integrityOf(r),
  };
}

export type AuditQuery = {
  targetId?: string;
  actorId?: string;
  action?: string;
  /** e.g. "auth." or "program.|syllabus." */
  group?: string;
  ip?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  before?: string;
};

function buildAuditFilter(orgId: string, opts: AuditQuery) {
  const q: Record<string, unknown> = { orgId: oid(orgId) };
  if (opts.targetId && oid(opts.targetId)) q.targetIds = oid(opts.targetId);
  if (opts.actorId && oid(opts.actorId)) q.actorId = oid(opts.actorId);
  if (opts.action && opts.action in AUDIT_LABELS) q.action = opts.action;
  else if (opts.group) {
    const prefixes = opts.group.split('|').filter((p) => /^[a-z]+\.$/.test(p));
    if (prefixes.length) q.action = { $regex: `^(${prefixes.map((p) => p.replace('.', '\\.')).join('|')})` };
  }
  if (opts.ip && /^[0-9a-fA-F:.]{3,64}$/.test(opts.ip)) q.ip = opts.ip;
  if (opts.search?.trim()) {
    const re = new RegExp(opts.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ summary: re }, { actorEmail: re }, { actorName: re }];
  }
  const at: Record<string, Date> = {};
  if (opts.from) at.$gte = opts.from;
  if (opts.to) at.$lt = opts.to;
  if (opts.before) {
    const d = new Date(opts.before);
    if (!Number.isNaN(d.getTime())) at.$lt = d;
  }
  if (Object.keys(at).length) q.at = at;
  return q;
}

export async function listAudit(orgId: string, opts: AuditQuery = {}): Promise<AuditRow[]> {
  await db();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 5000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await AuditLog.find(buildAuditFilter(orgId, opts)).sort({ at: -1 }).limit(limit).lean();
  return rows.map(toRow);
}

// ---------------------------------------------------------------------------
// Security dashboard numbers
// ---------------------------------------------------------------------------

export type SecurityStats = {
  window24h: { logins: number; failed: number; blocked: number; denied: number; uniqueIps: number };
  window7d: { logins: number; failed: number; blocked: number; denied: number };
  topFailedAccounts: { email: string; count: number; lastAt: string }[];
  topFailedIps: { ip: string; count: number; lastAt: string }[];
  integrity: { checked: number; valid: number; unsigned: number; tampered: number };
  signingEnabled: boolean;
};

export async function getSecurityStats(orgId: string): Promise<SecurityStats> {
  await db();
  const org = oid(orgId);
  const now = Date.now();
  const d1 = new Date(now - 864e5);
  const d7 = new Date(now - 7 * 864e5);

  const countBy = async (since: Date) => {
    const rows = (await AuditLog.aggregate([
      { $match: { orgId: org, at: { $gte: since }, action: { $in: ['auth.login', 'auth.login_failed', 'auth.login_blocked', 'security.access_denied'] } } },
      { $group: { _id: '$action', n: { $sum: 1 } } },
    ])) as { _id: string; n: number }[];
    const m = new Map(rows.map((r) => [r._id, r.n]));
    return {
      logins: m.get('auth.login') ?? 0,
      failed: m.get('auth.login_failed') ?? 0,
      blocked: m.get('auth.login_blocked') ?? 0,
      denied: m.get('security.access_denied') ?? 0,
    };
  };

  const [c1, c7, ips, topAcc, topIp, recent] = await Promise.all([
    countBy(d1),
    countBy(d7),
    AuditLog.distinct('ip', { orgId: org, at: { $gte: d1 }, action: { $regex: '^auth\\.' }, ip: { $ne: '' } }),
    AuditLog.aggregate([
      { $match: { orgId: org, at: { $gte: d7 }, action: { $in: ['auth.login_failed', 'auth.login_blocked'] } } },
      { $group: { _id: '$summary', count: { $sum: 1 }, lastAt: { $max: '$at' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    AuditLog.aggregate([
      { $match: { orgId: org, at: { $gte: d7 }, action: { $in: ['auth.login_failed', 'auth.login_blocked'] }, ip: { $ne: '' } } },
      { $group: { _id: '$ip', count: { $sum: 1 }, lastAt: { $max: '$at' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    AuditLog.find({ orgId: org }).sort({ at: -1 }).limit(500).lean(),
  ]);

  const integ = { checked: 0, valid: 0, unsigned: 0, tampered: 0 };
  for (const r of recent) {
    integ.checked++;
    integ[integrityOf(r)]++;
  }

  return {
    window24h: { ...c1, uniqueIps: (ips as unknown[]).length },
    window7d: c7,
    topFailedAccounts: (topAcc as { _id: string; count: number; lastAt: Date }[]).map((r) => ({
      email: r._id || '—',
      count: r.count,
      lastAt: new Date(r.lastAt).toISOString(),
    })),
    topFailedIps: (topIp as { _id: string; count: number; lastAt: Date }[]).map((r) => ({
      ip: r._id,
      count: r.count,
      lastAt: new Date(r.lastAt).toISOString(),
    })),
    integrity: integ,
    signingEnabled: !!signingKey(),
  };
}
