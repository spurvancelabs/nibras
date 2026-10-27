// =============================================================================
// FILE: lib/tokens.ts   (NEW FILE — server only)
// Token currency: wallets, rewards, admin grants, transfers and spending.
//
// Integrity rules
//   - the balance lives on User.tokens and only changes with a ledger entry
//   - spending/deducting/sending use a conditional update (balance ≥ amount),
//     so balances can never go negative, even with simultaneous requests
//   - automatic rewards carry an idempotency key → never paid twice
//   - automatic rewards respect the daily cap; admin grants don't
//   - every admin action and transfer is audited
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';
import TokenTransaction from '@/models/TokenTransaction';
import { getSettings } from './settings';
import { capAmount, type TokenRuleKey, type TxKind } from './tokens-core';
import { auditBy } from './audit';
import { notify } from './notifications';
import { hit } from './rate-limit';
import { invalidateAuthState } from './auth-state';

const oid = (id: string) => new Types.ObjectId(id);
const isId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);
type Actor = { id: string; orgId: string; email?: string | null; name?: string | null };

function startOfDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function sumSince(orgId: string, userId: string, kinds: TxKind[], since: Date): Promise<number> {
  const rows = (await TokenTransaction.find({ orgId: oid(orgId), userId: oid(userId), kind: { $in: kinds }, createdAt: { $gte: since } })
    .select('amount')
    .limit(5000)
    .lean()) as { amount: number }[];
  return rows.reduce((a, r) => a + Math.abs(r.amount), 0);
}

/** Credit tokens with a ledger entry. Returns the new balance (or null if the key was already used). */
async function credit(orgId: string, userId: string, amount: number, entry: { kind: TxKind; reason: string; rule?: string; refType?: string; refId?: string; key?: string; actorId?: string; counterpartyId?: string }): Promise<number | null> {
  let tx;
  try {
    tx = await TokenTransaction.create({
      orgId: oid(orgId),
      userId: oid(userId),
      kind: entry.kind,
      amount,
      reason: entry.reason.slice(0, 300),
      rule: entry.rule ?? '',
      refType: entry.refType ?? '',
      refId: entry.refId ?? '',
      key: entry.key ?? '',
      actorId: entry.actorId ? oid(entry.actorId) : null,
      counterpartyId: entry.counterpartyId ? oid(entry.counterpartyId) : null,
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return null; // already rewarded
    throw e;
  }
  const upd = await User.updateOne({ _id: oid(userId), orgId: oid(orgId) }, { $inc: { tokens: amount } });
  const u = upd.modifiedCount ? ((await User.findOne({ _id: oid(userId) }).select('tokens').lean()) as { tokens: number } | null) : null;
  if (!u) {
    await TokenTransaction.deleteOne({ _id: tx._id });
    return null;
  }
  await TokenTransaction.updateOne({ _id: tx._id }, { $set: { balanceAfter: u.tokens } });
  void invalidateAuthState([userId]); // refresh the balance shown in the top bar
  return u.tokens;
}

/** Take tokens if (and only if) the balance covers it. Returns new balance or null. */
async function debit(orgId: string, userId: string, amount: number, entry: { kind: TxKind; reason: string; refType?: string; refId?: string; key?: string; actorId?: string; counterpartyId?: string }): Promise<number | null> {
  // Atomic: only succeeds when the balance covers it (no overdraft under races).
  const upd = await User.updateOne({ _id: oid(userId), orgId: oid(orgId), tokens: { $gte: amount } }, { $inc: { tokens: -amount } });
  if (!upd.modifiedCount) return null;
  const u = ((await User.findOne({ _id: oid(userId) }).select('tokens').lean()) as { tokens: number } | null) ?? { tokens: 0 };
  try {
    await TokenTransaction.create({
      orgId: oid(orgId),
      userId: oid(userId),
      kind: entry.kind,
      amount: -amount,
      balanceAfter: u.tokens,
      reason: entry.reason.slice(0, 300),
      refType: entry.refType ?? '',
      refId: entry.refId ?? '',
      key: entry.key ?? '',
      actorId: entry.actorId ? oid(entry.actorId) : null,
      counterpartyId: entry.counterpartyId ? oid(entry.counterpartyId) : null,
    });
  } catch (e) {
    // Couldn't record it → give the tokens back (never lose money silently).
    await User.updateOne({ _id: oid(userId), orgId: oid(orgId) }, { $inc: { tokens: amount } });
    if ((e as { code?: number }).code === 11000) return null;
    throw e;
  }
  void invalidateAuthState([userId]);
  return u.tokens;
}

// ---------------------------------------------------------------------------
// Automatic rewards
// ---------------------------------------------------------------------------

/**
 * Reward `userId` for `rule` once per `refKey`. Never throws — rewards must
 * never break the action that triggered them.
 */
export async function reward(orgId: string, userId: string, rule: TokenRuleKey, refKey: string, reason: string, group?: string): Promise<number> {
  try {
    const s = await getSettings();
    if (!s.tokensEnabled) return 0;
    const base = Math.round(Number(s.tokenRules?.[rule]) || 0);
    if (base <= 0) return 0;
    await db();
    const earnedToday = await sumSince(orgId, userId, ['earn'], startOfDay());
    const amount = capAmount(base, earnedToday, s.tokenDailyCap);
    if (amount <= 0) return 0;
    const bal = await credit(orgId, userId, amount, { kind: 'earn', reason, rule, refType: rule, refId: refKey, key: `earn:${group ?? rule}:${refKey}` });
    return bal === null ? 0 : amount;
  } catch (e) {
    console.warn('[tokens] reward failed', rule, e);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Admin grant / deduct
// ---------------------------------------------------------------------------

export async function adminAdjust(actor: Actor, userIds: string[], amount: number, reason: string): Promise<{ ok: true; changed: number; skipped: number } | { ok: false; error: string }> {
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return { ok: false, error: 'Enter a whole number (not 0).' };
  const ids = [...new Set(userIds)].filter(isId).slice(0, 1000);
  if (!ids.length) return { ok: false, error: 'Choose at least one person.' };
  await db();
  const valid = (await User.find({ _id: { $in: ids.map(oid) }, orgId: oid(actor.orgId) }).select('_id').lean()).map((u) => String((u as { _id: unknown })._id));
  let changed = 0;
  let skipped = 0;
  for (const id of valid) {
    const r =
      amount > 0
        ? await credit(actor.orgId, id, amount, { kind: 'grant', reason: reason || 'Given by an admin', actorId: actor.id })
        : await debit(actor.orgId, id, -amount, { kind: 'deduct', reason: reason || 'Removed by an admin', actorId: actor.id });
    if (r === null) skipped++;
    else changed++;
  }
  const s = await getSettings();
  await auditBy(actor, 'tokens.adjusted', `${amount > 0 ? '+' : ''}${amount} ${s.tokenName} for ${changed} user(s)${skipped ? ` (${skipped} skipped: not enough balance)` : ''}`, valid, { amount, reason });
  if (amount > 0) {
    for (const id of valid.slice(0, 300)) {
      await notify({ orgId: actor.orgId, userId: id, type: 'system.alert', title: `You received ${amount} ${s.tokenName}`, body: reason || 'From your organisation.', link: '/wallet' });
    }
  }
  return { ok: true, changed, skipped };
}

// ---------------------------------------------------------------------------
// Transfers between people
// ---------------------------------------------------------------------------

export async function transfer(from: Actor, toEmail: string, amount: number, note: string): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const s = await getSettings();
  if (!s.tokensEnabled || !s.tokenTransfers) return { ok: false, error: 'Sending is turned off.' };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'Enter a whole number above 0.' };
  if ((await hit(`token-transfer:${from.id}`, 3600)) > 20) return { ok: false, error: 'Too many transfers — try again later.' };
  await db();
  const to = (await User.findOne({ orgId: oid(from.orgId), email: toEmail.trim().toLowerCase(), status: 'active' }).select('_id name').lean()) as { _id: unknown; name: string } | null;
  if (!to) return { ok: false, error: 'No active person with that email in your organisation.' };
  if (String(to._id) === from.id) return { ok: false, error: 'You can’t send tokens to yourself.' };
  const sentToday = await sumSince(from.orgId, from.id, ['transfer_out'], startOfDay());
  if (sentToday + amount > s.tokenTransferDailyMax) return { ok: false, error: `You can send up to ${s.tokenTransferDailyMax} ${s.tokenName} per day (${Math.max(0, s.tokenTransferDailyMax - sentToday)} left today).` };
  const bal = await debit(from.orgId, from.id, amount, { kind: 'transfer_out', reason: note || `To ${to.name}`, counterpartyId: String(to._id), refType: 'transfer' });
  if (bal === null) return { ok: false, error: 'Not enough tokens.' };
  await credit(from.orgId, String(to._id), amount, { kind: 'transfer_in', reason: note || `From ${from.name ?? 'a member'}`, counterpartyId: from.id, refType: 'transfer' });
  await auditBy(from, 'tokens.transfer', `Sent ${amount} ${s.tokenName} to ${to.name}`, [String(to._id)], { amount });
  await notify({ orgId: from.orgId, userId: String(to._id), type: 'system.alert', title: `${from.name ?? 'Someone'} sent you ${amount} ${s.tokenName}`, body: note, link: '/wallet' });
  return { ok: true, balance: bal };
}

// ---------------------------------------------------------------------------
// Spending (premium plans, sessions, courses)
// ---------------------------------------------------------------------------

/** Pay `amount` tokens once per `key`. Returns ok + new balance, or an error. */
export async function spend(user: Actor, amount: number, entry: { reason: string; refType: string; refId: string; key: string }): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const s = await getSettings();
  if (!s.tokensEnabled) return { ok: false, error: `${s.tokenName} are turned off.` };
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: 'Invalid price.' };
  await db();
  if (amount === 0) return { ok: true, balance: await balanceOf(user.orgId, user.id) };
  const bal = await debit(user.orgId, user.id, amount, { kind: 'spend', ...entry });
  if (bal === null) {
    const already = await TokenTransaction.exists({ userId: oid(user.id), key: entry.key });
    return { ok: false, error: already ? 'You already bought this.' : `Not enough ${s.tokenName}. You need ${amount}.` };
  }
  return { ok: true, balance: bal };
}

/** Undo a spend (e.g. the purchase could not be completed). */
export async function refund(user: Actor, amount: number, reason: string, refType: string, refId: string): Promise<void> {
  if (amount > 0) await credit(user.orgId, user.id, amount, { kind: 'refund', reason, refType, refId });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function balanceOf(orgId: string, userId: string): Promise<number> {
  await db();
  const u = (await User.findOne({ _id: oid(userId), orgId: oid(orgId) }).select('tokens').lean()) as { tokens?: number } | null;
  return u?.tokens ?? 0;
}

export type TxRow = { id: string; kind: TxKind; amount: number; balanceAfter: number | null; reason: string; at: string };

export async function history(orgId: string, userId: string, limit = 50): Promise<TxRow[]> {
  await db();
  const rows = (await TokenTransaction.find({ orgId: oid(orgId), userId: oid(userId) }).sort({ createdAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    kind: TxKind;
    amount: number;
    balanceAfter?: number | null;
    reason?: string;
    createdAt: Date;
  }[];
  return rows.map((r) => ({ id: String(r._id), kind: r.kind, amount: r.amount, balanceAfter: r.balanceAfter ?? null, reason: r.reason ?? '', at: new Date(r.createdAt).toISOString() }));
}

export async function earnedThisMonth(orgId: string, userId: string): Promise<number> {
  const d = new Date();
  return sumSince(orgId, userId, ['earn'], new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

/** Top earners this month (first names only — privacy). */
export async function leaderboard(orgId: string, limit = 20): Promise<{ userId: string; name: string; earned: number }[]> {
  await db();
  const d = new Date();
  const since = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const rows = (await TokenTransaction.find({ orgId: oid(orgId), kind: 'earn', createdAt: { $gte: since } }).select('userId amount').limit(50000).lean()) as { userId: unknown; amount: number }[];
  const m = new Map<string, number>();
  for (const r of rows) m.set(String(r.userId), (m.get(String(r.userId)) ?? 0) + r.amount);
  const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const users = (await User.find({ _id: { $in: top.map(([id]) => oid(id)) }, role: 'student' }).select('name').lean()) as { _id: unknown; name: string }[];
  const name = new Map(users.map((u) => [String(u._id), u.name.split(' ')[0]]));
  return top.filter(([id]) => name.has(id)).map(([id, earned]) => ({ userId: id, name: name.get(id)!, earned }));
}

export type TokenOverview = { circulation: number; holders: number; earned30: number; spent30: number; granted30: number; top: { id: string; name: string; email: string; tokens: number }[] };

export async function tokenOverview(orgId: string): Promise<TokenOverview> {
  await db();
  const org = oid(orgId);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [holders, tx] = await Promise.all([
    User.find({ orgId: org, tokens: { $gt: 0 } }).select('name email tokens').sort({ tokens: -1 }).limit(2000).lean() as Promise<{ _id: unknown; name: string; email: string; tokens: number }[]>,
    TokenTransaction.find({ orgId: org, createdAt: { $gte: since } }).select('kind amount').limit(100000).lean() as Promise<{ kind: TxKind; amount: number }[]>,
  ]);
  const sum = (k: TxKind[]) => tx.filter((t) => k.includes(t.kind)).reduce((a, t) => a + Math.abs(t.amount), 0);
  return {
    circulation: holders.reduce((a, u) => a + u.tokens, 0),
    holders: holders.length,
    earned30: sum(['earn']),
    spent30: sum(['spend']),
    granted30: sum(['grant']),
    top: holders.slice(0, 10).map((u) => ({ id: String(u._id), name: u.name, email: u.email, tokens: u.tokens })),
  };
}

export async function recentLedger(orgId: string, limit = 100): Promise<(TxRow & { userName: string })[]> {
  await db();
  const rows = (await TokenTransaction.find({ orgId: oid(orgId) }).sort({ createdAt: -1 }).limit(limit).lean()) as {
    _id: unknown;
    userId: unknown;
    kind: TxKind;
    amount: number;
    balanceAfter?: number | null;
    reason?: string;
    createdAt: Date;
  }[];
  const users = (await User.find({ _id: { $in: rows.map((r) => r.userId) } }).select('name').lean()) as { _id: unknown; name: string }[];
  const name = new Map(users.map((u) => [String(u._id), u.name]));
  return rows.map((r) => ({ id: String(r._id), kind: r.kind, amount: r.amount, balanceAfter: r.balanceAfter ?? null, reason: r.reason ?? '', at: new Date(r.createdAt).toISOString(), userName: name.get(String(r.userId)) ?? 'Unknown' }));
}
