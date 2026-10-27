// =============================================================================
// FILE: lib/premium.ts   (NEW FILE — server only)
// Premium membership service: grant / extend / revoke, redeemable codes,
// member lists, history and the daily expiry sweep.
//
// A user is premium while `premiumUntil` is in the future (lib/entitlements).
// Expiry needs no job to take effect — access simply stops at the end date.
// The daily sweep only records the "expired" event and sends notices.
// Everything is audited; codes are stored hashed and redeemed atomically.
// =============================================================================

import 'server-only';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';
import Program from '@/models/Program';
import MembershipEvent, { type MembershipEventType } from '@/models/MembershipEvent';
import PremiumCode from '@/models/PremiumCode';
import { LIFETIME, isPremiumActive, isLifetime, type EntitlementPolicy } from './entitlements';
import { invalidateAuthState } from './auth-state';
import { auditBy } from './audit';
import { notify } from './notifications';
import { hit } from './rate-limit';
import type { ThemeSettings } from './theme-config';

type Actor = { id: string; orgId: string; email?: string | null; name?: string | null };

const oid = (id: string) => new Types.ObjectId(id);
const DAY = 86_400_000;

export function policyFrom(s: ThemeSettings): EntitlementPolicy {
  return {
    premiumEnabled: s.premiumEnabled === true,
    themeTiers: s.themeTiers as Record<string, string>,
    themeOverrides: s.themeOverrides as Record<string, string>,
    styleTiers: s.styleTiers as Record<string, string>,
    styleOverrides: s.styleOverrides as Record<string, string>,
  };
}

/** New end date when adding `days` (0 = lifetime) on top of `current`. */
export function extendUntil(current: Date | null | undefined, days: number, now: number = Date.now()): Date {
  if (days <= 0) return LIFETIME;
  if (isLifetime(current)) return LIFETIME;
  const base = current && isPremiumActive(current, now) ? new Date(current).getTime() : now;
  return new Date(base + days * DAY);
}

async function record(
  orgId: string,
  userId: string,
  type: MembershipEventType,
  until: Date | null,
  previousUntil: Date | null,
  extra: { source?: string; actor?: Actor | null; codeId?: string | null; note?: string } = {}
) {
  try {
    await MembershipEvent.create({
      orgId: oid(orgId),
      userId: oid(userId),
      type,
      until,
      previousUntil,
      source: extra.source ?? 'admin',
      actorId: extra.actor ? oid(extra.actor.id) : null,
      actorName: extra.actor?.name ?? '',
      codeId: extra.codeId ? oid(extra.codeId) : null,
      note: (extra.note ?? '').slice(0, 300),
    });
  } catch (e) {
    console.error('[premium] history write failed', e);
  }
}

function untilLabel(d: Date): string {
  return isLifetime(d) ? 'lifetime' : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Grant / extend / revoke (admin)
// ---------------------------------------------------------------------------

export type GrantInput = {
  userIds: string[];
  /** 0 = lifetime */
  days: number;
  /** 'extend' adds on top of time left; 'set' starts from today. */
  mode: 'extend' | 'set';
  note?: string;
  notifyUsers?: boolean;
  /** How it was obtained (history + member list). Default 'admin'. */
  source?: 'admin' | 'tokens';
};

export async function grantPremium(actor: Actor, input: GrantInput): Promise<{ changed: number }> {
  await db();
  const ids = [...new Set(input.userIds)].filter((id) => Types.ObjectId.isValid(id)).slice(0, 1000);
  const users = (await User.find({ _id: { $in: ids.map(oid) }, orgId: oid(actor.orgId) })
    .select('_id premiumUntil premiumSince')
    .lean()) as { _id: unknown; premiumUntil?: Date | null; premiumSince?: Date | null }[];
  const now = Date.now();
  const ops = [];
  const events: { userId: string; type: MembershipEventType; until: Date; prev: Date | null }[] = [];
  for (const u of users) {
    const prev = u.premiumUntil ?? null;
    const active = isPremiumActive(prev, now);
    const until = input.mode === 'set' ? extendUntil(null, input.days, now) : extendUntil(prev, input.days, now);
    const set: Record<string, unknown> = { premiumUntil: until, premiumSource: input.source ?? 'admin' };
    if (!active) set.premiumSince = new Date(now);
    ops.push({ updateOne: { filter: { _id: u._id, orgId: oid(actor.orgId) }, update: { $set: set } } });
    events.push({ userId: String(u._id), type: active ? 'extended' : 'granted', until, prev });
  }
  if (ops.length) await User.bulkWrite(ops);
  for (const e of events) await record(actor.orgId, e.userId, e.type, e.until, e.prev, { actor, note: input.note, source: input.source ?? 'admin' });
  await invalidateAuthState(events.map((e) => e.userId));
  if (input.notifyUsers !== false) {
    for (const e of events.slice(0, 300)) {
      await notify({
        orgId: actor.orgId,
        userId: e.userId,
        type: 'premium.granted',
        title: e.type === 'granted' ? 'You now have Premium' : 'Your Premium was extended',
        body: isLifetime(e.until) ? 'Enjoy lifetime access to every premium theme and style.' : `Premium is active until ${untilLabel(e.until)}.`,
        link: '/premium',
      });
    }
  }
  if (events.length) {
    await auditBy(
      actor,
      events.some((e) => e.type === 'granted') ? 'premium.granted' : 'premium.extended',
      `Premium ${input.days ? `+${input.days} days` : 'lifetime'} for ${events.length} user(s)`,
      events.map((e) => e.userId),
      { days: input.days, mode: input.mode, note: input.note ?? '' }
    );
  }
  return { changed: events.length };
}

/** Grant to every learner (and optionally mentors) of a program. */
export async function grantPremiumToProgram(
  actor: Actor,
  programId: string,
  input: Omit<GrantInput, 'userIds'> & { includeMentors?: boolean }
): Promise<{ changed: number }> {
  await db();
  if (!Types.ObjectId.isValid(programId)) return { changed: 0 };
  const p = (await Program.findOne({ _id: oid(programId), orgId: oid(actor.orgId) }).select('students mentors').lean()) as
    | { students?: unknown[]; mentors?: unknown[] }
    | null;
  if (!p) return { changed: 0 };
  const ids = [...(p.students ?? []), ...(input.includeMentors ? p.mentors ?? [] : [])].map(String);
  return grantPremium(actor, { ...input, userIds: ids });
}

export async function revokePremium(actor: Actor, userIds: string[], note = ''): Promise<{ changed: number }> {
  await db();
  const ids = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id)).slice(0, 1000);
  const users = (await User.find({ _id: { $in: ids.map(oid) }, orgId: oid(actor.orgId), premiumUntil: { $gt: new Date() } })
    .select('_id premiumUntil')
    .lean()) as { _id: unknown; premiumUntil: Date }[];
  if (!users.length) return { changed: 0 };
  await User.updateMany({ _id: { $in: users.map((u) => u._id) }, orgId: oid(actor.orgId) }, { $set: { premiumUntil: null } });
  for (const u of users) await record(actor.orgId, String(u._id), 'revoked', null, u.premiumUntil, { actor, note });
  const changed = users.map((u) => String(u._id));
  await invalidateAuthState(changed);
  await auditBy(actor, 'premium.revoked', `Premium removed from ${changed.length} user(s)`, changed, { note });
  return { changed: changed.length };
}

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I

export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashCode(orgId: string, code: string): string {
  return crypto.createHash('sha256').update(`nibras-premium:${orgId}:${normaliseCode(code)}`).digest('hex');
}

function newCode(): string {
  const bytes = crypto.randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `NIB-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export type CodeInput = { count: number; days: number; maxUses: number; expiresAt?: Date | null; programId?: string | null; label?: string };

/** Returns the plain codes ONCE — only hashes are stored. */
export async function createCodes(actor: Actor, input: CodeInput): Promise<string[]> {
  await db();
  const count = Math.min(200, Math.max(1, Math.round(input.count)));
  const codes: string[] = [];
  const docs = [];
  for (let i = 0; i < count; i++) {
    const c = newCode();
    codes.push(c);
    docs.push({
      orgId: oid(actor.orgId),
      hash: hashCode(actor.orgId, c),
      hint: c.slice(-4),
      label: (input.label ?? '').slice(0, 80),
      days: Math.min(3650, Math.max(0, Math.round(input.days))),
      maxUses: Math.min(10000, Math.max(1, Math.round(input.maxUses))),
      programId: input.programId && Types.ObjectId.isValid(input.programId) ? oid(input.programId) : null,
      expiresAt: input.expiresAt ?? null,
      createdBy: oid(actor.id),
    });
  }
  await PremiumCode.insertMany(docs);
  await auditBy(actor, 'premium.code_created', `${count} premium code(s) created (${input.days ? `${input.days} days` : 'lifetime'}, ${input.maxUses} use(s) each)`, [], {
    count,
    days: input.days,
    maxUses: input.maxUses,
    label: input.label ?? '',
  });
  return codes;
}

export async function disableCode(actor: Actor, codeId: string): Promise<boolean> {
  await db();
  if (!Types.ObjectId.isValid(codeId)) return false;
  const r = await PremiumCode.updateOne({ _id: oid(codeId), orgId: oid(actor.orgId) }, { $set: { disabled: true } });
  if (r.modifiedCount) await auditBy(actor, 'premium.code_disabled', 'Premium code disabled', [], { codeId });
  return r.modifiedCount > 0;
}

export type RedeemResult = { ok: true; until: string } | { ok: false; error: string };

export async function redeemCode(user: Actor & { programIds?: string[] }, raw: string, enabled: boolean): Promise<RedeemResult> {
  if (!enabled) return { ok: false, error: 'Premium is not available right now.' };
  const code = normaliseCode(raw);
  if (code.length < 10 || code.length > 24) return { ok: false, error: 'That code does not look right.' };

  // Brute-force protection: 10 tries per user per hour.
  const n = await hit(`premium-redeem:${user.id}`, 3600);
  if (n > 10) return { ok: false, error: 'Too many attempts. Please try again in an hour.' };

  await db();
  const now = new Date();
  const uid = oid(user.id);
  const found = (await PremiumCode.findOne({ orgId: oid(user.orgId), hash: hashCode(user.orgId, code) }).lean()) as
    | { _id: unknown; disabled: boolean; uses: number; maxUses: number; expiresAt?: Date | null; programId?: unknown; redeemedBy?: unknown[]; days: number }
    | null;
  const invalid = { ok: false as const, error: 'This code is not valid or has expired.' };
  if (!found || found.disabled) return invalid;
  if (found.expiresAt && new Date(found.expiresAt) <= now) return invalid;
  if ((found.redeemedBy ?? []).map(String).includes(user.id)) return { ok: false, error: 'You have already used this code.' };
  if (found.uses >= found.maxUses) return { ok: false, error: 'This code has been fully used.' };
  if (found.programId) {
    const me = (await User.findOne({ _id: uid, orgId: oid(user.orgId) }).select('programIds').lean()) as { programIds?: unknown[] } | null;
    if (!(me?.programIds ?? []).map(String).includes(String(found.programId))) return invalid;
  }

  // Atomic claim — two people racing for the last use can't both win.
  const claimed = await PremiumCode.findOneAndUpdate(
    {
      _id: found._id,
      orgId: oid(user.orgId),
      disabled: false,
      redeemedBy: { $ne: uid },
      uses: { $lt: found.maxUses }, // maxUses never changes, so this stays atomic
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    { $inc: { uses: 1 }, $push: { redeemedBy: uid } },
    { new: true }
  ).lean();
  if (!claimed) return { ok: false, error: 'This code has just been used up.' };

  const me = (await User.findOne({ _id: uid, orgId: oid(user.orgId) }).select('premiumUntil').lean()) as { premiumUntil?: Date | null } | null;
  const prev = me?.premiumUntil ?? null;
  const until = extendUntil(prev, found.days);
  const set: Record<string, unknown> = { premiumUntil: until, premiumSource: 'code' };
  if (!isPremiumActive(prev)) set.premiumSince = now;
  await User.updateOne({ _id: uid, orgId: oid(user.orgId) }, { $set: set });
  await record(user.orgId, user.id, 'redeemed', until, prev, { source: 'code', actor: user, codeId: String(found._id) });
  await invalidateAuthState([user.id]);
  await auditBy(user, 'premium.redeemed', `Redeemed a premium code (${found.days ? `${found.days} days` : 'lifetime'})`, [user.id], {
    codeId: String(found._id),
  });
  return { ok: true, until: until.toISOString() };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  until: string | null;
  since: string | null;
  source: string;
  status: 'active' | 'expiring' | 'expired' | 'free';
};

export type MemberFilter = 'all' | 'active' | 'expiring' | 'expired' | 'free';

export async function listMembers(orgId: string, opts: { q?: string; filter?: MemberFilter; limit?: number } = {}): Promise<MemberRow[]> {
  await db();
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * DAY);
  const q: Record<string, unknown> = { orgId: oid(orgId), role: { $in: ['student', 'mentor'] } };
  const f = opts.filter ?? 'active';
  if (f === 'active') q.premiumUntil = { $gt: now };
  if (f === 'expiring') q.premiumUntil = { $gt: now, $lte: soon };
  if (f === 'expired') q.$and = [{ premiumUntil: { $lte: now } }, { premiumUntil: { $ne: null } }];
  if (f === 'free') q.$or = [{ premiumUntil: null }, { premiumUntil: { $lte: now } }];
  const term = (opts.q ?? '').trim().slice(0, 80);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$and = [...((q.$and as unknown[]) ?? []), { $or: [{ name: rx }, { email: rx }, { memberId: rx }] }];
  }
  const rows = (await User.find(q)
    .select('name email role premiumUntil premiumSince premiumSource')
    .sort({ premiumUntil: -1, name: 1 })
    .limit(Math.min(500, opts.limit ?? 200))
    .lean()) as { _id: unknown; name: string; email: string; role: string; premiumUntil?: Date | null; premiumSince?: Date | null; premiumSource?: string }[];
  return rows.map((r) => {
    const until = r.premiumUntil ? new Date(r.premiumUntil) : null;
    const active = isPremiumActive(until, now.getTime());
    const status: MemberRow['status'] = !until ? 'free' : !active ? 'expired' : !isLifetime(until) && until <= soon ? 'expiring' : 'active';
    return {
      id: String(r._id),
      name: r.name,
      email: r.email,
      role: r.role,
      until: until ? until.toISOString() : null,
      since: r.premiumSince ? new Date(r.premiumSince).toISOString() : null,
      source: r.premiumSource ?? '',
      status,
    };
  });
}

export type HistoryRow = { id: string; type: MembershipEventType; until: string | null; source: string; actorName: string; note: string; at: string };

export async function membershipHistory(orgId: string, userId: string, limit = 30): Promise<HistoryRow[]> {
  await db();
  if (!Types.ObjectId.isValid(userId)) return [];
  const rows = (await MembershipEvent.find({ orgId: oid(orgId), userId: oid(userId) }).sort({ createdAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    type: MembershipEventType;
    until?: Date | null;
    source?: string;
    actorName?: string;
    note?: string;
    createdAt: Date;
  }[];
  return rows.map((r) => ({
    id: String(r._id),
    type: r.type,
    until: r.until ? new Date(r.until).toISOString() : null,
    source: r.source ?? '',
    actorName: r.actorName ?? '',
    note: r.note ?? '',
    at: new Date(r.createdAt).toISOString(),
  }));
}

export type CodeRow = {
  id: string;
  hint: string;
  label: string;
  days: number;
  uses: number;
  maxUses: number;
  expiresAt: string | null;
  disabled: boolean;
  programId: string | null;
  createdAt: string;
  state: 'active' | 'used' | 'expired' | 'disabled';
};

export async function listCodes(orgId: string, limit = 200): Promise<CodeRow[]> {
  await db();
  const now = Date.now();
  const rows = (await PremiumCode.find({ orgId: oid(orgId) }).sort({ createdAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    hint: string;
    label: string;
    days: number;
    uses: number;
    maxUses: number;
    expiresAt?: Date | null;
    disabled: boolean;
    programId?: unknown;
    createdAt: Date;
  }[];
  return rows.map((r) => ({
    id: String(r._id),
    hint: r.hint,
    label: r.label,
    days: r.days,
    uses: r.uses,
    maxUses: r.maxUses,
    expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
    disabled: r.disabled,
    programId: r.programId ? String(r.programId) : null,
    createdAt: new Date(r.createdAt).toISOString(),
    state: r.disabled ? 'disabled' : r.expiresAt && new Date(r.expiresAt).getTime() <= now ? 'expired' : r.uses >= r.maxUses ? 'used' : 'active',
  }));
}

export type PremiumStats = { active: number; expiring: number; expired30: number; lifetime: number; codesActive: number; redeemed30: number };

export async function premiumStats(orgId: string): Promise<PremiumStats> {
  await db();
  const now = new Date();
  const org = oid(orgId);
  const [active, expiring, expired30, lifetime, codesActive, redeemed30] = await Promise.all([
    User.countDocuments({ orgId: org, premiumUntil: { $gt: now } }),
    User.countDocuments({ orgId: org, premiumUntil: { $gt: now, $lte: new Date(now.getTime() + 7 * DAY) } }),
    User.countDocuments({ orgId: org, premiumUntil: { $lte: now, $gt: new Date(now.getTime() - 30 * DAY) } }),
    User.countDocuments({ orgId: org, premiumUntil: { $gte: LIFETIME } }),
    (PremiumCode.find({ orgId: org, disabled: false, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).select('uses maxUses').limit(5000).lean() as Promise<{ uses: number; maxUses: number }[]>).then(
      (rows) => rows.filter((r) => r.uses < r.maxUses).length
    ),
    MembershipEvent.countDocuments({ orgId: org, type: 'redeemed', createdAt: { $gt: new Date(now.getTime() - 30 * DAY) } }),
  ]);
  return { active, expiring, expired30, lifetime, codesActive, redeemed30 };
}

// ---------------------------------------------------------------------------
// Daily sweep (called from /api/cron/daily)
// ---------------------------------------------------------------------------

/** Sends "expiring in N days" / "expired" notices and records expiry. Idempotent. */
export async function premiumSweep(orgId: string, deadline: number): Promise<{ expiringNotified: number; expired: number }> {
  await db();
  const now = new Date();
  const org = oid(orgId);
  let expiringNotified = 0;
  let expired = 0;

  const soon = (await User.find({ orgId: org, status: 'active', premiumUntil: { $gt: now, $lte: new Date(now.getTime() + 7 * DAY) } })
    .select('_id premiumUntil')
    .limit(500)
    .lean()) as { _id: unknown; premiumUntil: Date }[];
  for (const u of soon) {
    if (Date.now() > deadline) break;
    const day = new Date(u.premiumUntil).toISOString().slice(0, 10);
    const sent = await notify({
      orgId,
      userId: String(u._id),
      type: 'premium.expiring',
      title: 'Your Premium ends soon',
      body: `Premium ends on ${day}. Premium themes will switch back to your organisation's theme after that — your choice is kept and comes back if you renew.`,
      link: '/premium',
      email: true,
      dedupeKey: `premium-expiring:${day}`,
    });
    if (sent) expiringNotified++;
  }

  // Expired in the last 3 days and not yet recorded.
  const ended = (await User.find({ orgId: org, premiumUntil: { $lte: now, $gt: new Date(now.getTime() - 3 * DAY) } })
    .select('_id premiumUntil')
    .limit(500)
    .lean()) as { _id: unknown; premiumUntil: Date }[];
  for (const u of ended) {
    if (Date.now() > deadline) break;
    const day = new Date(u.premiumUntil).toISOString().slice(0, 10);
    const first = await notify({
      orgId,
      userId: String(u._id),
      type: 'premium.expired',
      title: 'Your Premium has ended',
      body: 'Premium themes are paused and your organisation theme is shown instead. Renew any time to get them back.',
      link: '/premium',
      dedupeKey: `premium-expired:${day}`,
    });
    if (first) {
      await record(orgId, String(u._id), 'expired', null, u.premiumUntil, { source: 'system' });
      expired++;
    }
  }
  return { expiringNotified, expired };
}
