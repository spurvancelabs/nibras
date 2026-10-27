// =============================================================================
// FILE: lib/session-access.ts   (NEW FILE — server only)
// Premium and token-priced sessions. Enforced on the server: for a learner
// without access, the meeting link, recording and materials are never sent
// to the browser — only the title, time and agenda.
//
//   free     everyone in the program
//   premium  Premium members (and staff)
//   tokens   pay the price once (Premium members get it free)
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import Unlock from '@/models/Unlock';
import { getSettings } from './settings';
import { policyFrom } from './premium';
import { hasPremiumAccess } from './entitlements';
import { spend, refund } from './tokens';
import { auditBy } from './audit';
import type { SessionUser } from './auth-helpers';
import type { SessionListItem } from './sessions';

export type SessionLock = { locked: boolean; reason: 'premium' | 'tokens' | null; price: number };

/** Which of these sessions has this learner unlocked with tokens? */
export async function unlockedSessionIds(user: { id: string; orgId: string }, ids: string[]): Promise<Set<string>> {
  const valid = ids.filter((i) => Types.ObjectId.isValid(i));
  if (!valid.length) return new Set();
  await db();
  const rows = (await Unlock.find({ userId: new Types.ObjectId(user.id), itemType: 'session', itemId: { $in: valid.map((i) => new Types.ObjectId(i)) } })
    .select('itemId')
    .lean()) as { itemId: unknown }[];
  return new Set(rows.map((r) => String(r.itemId)));
}

export function lockFor(
  s: Pick<SessionListItem, 'access' | 'tokenPrice'>,
  user: { role: string; premiumUntil?: string | null },
  ctx: { premiumOn: boolean; tokensOn: boolean; premium: boolean; unlocked: boolean }
): SessionLock {
  if (user.role !== 'student') return { locked: false, reason: null, price: 0 };
  if (s.access === 'premium' && ctx.premiumOn && !ctx.premium) return { locked: true, reason: 'premium', price: 0 };
  if (s.access === 'tokens' && ctx.tokensOn && s.tokenPrice > 0 && !ctx.premium && !ctx.unlocked) return { locked: true, reason: 'tokens', price: s.tokenPrice };
  return { locked: false, reason: null, price: 0 };
}

/** Lock state for a list of sessions + copies with links removed where locked. */
export async function gateSessions<T extends SessionListItem>(user: SessionUser, sessions: T[]): Promise<(T & { lock: SessionLock })[]> {
  const st = await getSettings();
  const policy = policyFrom(st);
  const premium = hasPremiumAccess(user, policy) && st.premiumEnabled;
  const needs = sessions.filter((s) => s.access === 'tokens').map((s) => s.id);
  const unlocked = user.role === 'student' && needs.length ? await unlockedSessionIds(user, needs) : new Set<string>();
  return sessions.map((s) => {
    const lock = lockFor(s, user, { premiumOn: st.premiumEnabled, tokensOn: st.tokensEnabled, premium, unlocked: unlocked.has(s.id) });
    return lock.locked ? { ...s, meetingUrl: '', recordingUrl: '', lock } : { ...s, lock };
  });
}

export async function unlockSession(user: SessionUser, session: SessionListItem): Promise<{ ok: true } | { ok: false; error: string }> {
  const [g] = await gateSessions(user, [session]);
  if (!g.lock.locked) return { ok: true };
  if (g.lock.reason !== 'tokens') return { ok: false, error: 'This session is for Premium members.' };
  const price = g.lock.price;
  const paid = await spend(user, price, { reason: `Unlocked session “${session.title}”`, refType: 'session', refId: session.id, key: `session:${session.id}` });
  if (!paid.ok) return paid;
  try {
    await Unlock.create({ orgId: new Types.ObjectId(user.orgId), userId: new Types.ObjectId(user.id), itemType: 'session', itemId: new Types.ObjectId(session.id), via: 'tokens', tokens: price });
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) {
      await refund(user, price, `Refund: could not unlock “${session.title}”`, 'session', session.id);
      return { ok: false, error: 'Could not unlock right now — your tokens were returned.' };
    }
  }
  await auditBy(user, 'tokens.purchase', `Unlocked session “${session.title}” for ${price}`, [], { sessionId: session.id, price });
  return { ok: true };
}
