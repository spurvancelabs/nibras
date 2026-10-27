// =============================================================================
// FILE: lib/premium-plans.ts   (NEW FILE — server only)
// Premium plans (Super Admin manages them in Admin → Premium → Plans).
// Members can buy a plan with tokens; the time is added on top of any
// Premium they already have. Payment and membership are linked safely:
// if granting fails after paying, the tokens are refunded.
// =============================================================================

import 'server-only';
import { Types } from 'mongoose';
import { db } from './db';
import PremiumPlan from '@/models/PremiumPlan';
import { getSettings } from './settings';
import { spend, refund } from './tokens';
import { grantPremium } from './premium';
import { auditBy } from './audit';

const oid = (id: string) => new Types.ObjectId(id);
type Actor = { id: string; orgId: string; email?: string | null; name?: string | null };

export type Plan = { id: string; name: string; description: string; days: number; tokenPrice: number; priceLabel: string; highlight: boolean; active: boolean; sort: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPlan = (p: any): Plan => ({
  id: String(p._id),
  name: p.name,
  description: p.description ?? '',
  days: p.days ?? 30,
  tokenPrice: p.tokenPrice ?? 0,
  priceLabel: p.priceLabel ?? '',
  highlight: p.highlight === true,
  active: p.active !== false,
  sort: p.sort ?? 0,
});

export async function listPlans(orgId: string, activeOnly = true): Promise<Plan[]> {
  await db();
  const q: Record<string, unknown> = { orgId: oid(orgId) };
  if (activeOnly) q.active = true;
  return ((await PremiumPlan.find(q).sort({ sort: 1, days: 1 }).lean()) as unknown[]).map(toPlan);
}

export type PlanInput = Omit<Plan, 'id'>;

export async function savePlan(actor: Actor, input: PlanInput, id?: string): Promise<Plan> {
  await db();
  const doc = { ...input, name: input.name.trim().slice(0, 60) };
  const saved = id
    ? await PremiumPlan.findOneAndUpdate({ _id: oid(id), orgId: oid(actor.orgId) }, { $set: doc }, { new: true }).lean()
    : (await PremiumPlan.create({ ...doc, orgId: oid(actor.orgId) })).toObject();
  if (!saved) throw new Error('Plan not found');
  await auditBy(actor, 'premium.plan_saved', `${doc.name}: ${doc.days ? `${doc.days} days` : 'lifetime'}${doc.tokenPrice ? `, ${doc.tokenPrice} tokens` : ''}${doc.active ? '' : ' (hidden)'}`);
  return toPlan(saved);
}

export async function buyPlan(user: Actor & { role: string }, planId: string, idem: string): Promise<{ ok: true; until?: string } | { ok: false; error: string }> {
  const s = await getSettings();
  if (!s.premiumEnabled) return { ok: false, error: 'Premium is not available.' };
  if (!s.tokensEnabled) return { ok: false, error: `${s.tokenName} are turned off.` };
  if (!Types.ObjectId.isValid(planId) || !/^[a-zA-Z0-9-]{8,64}$/.test(idem)) return { ok: false, error: 'Invalid request.' };
  await db();
  const p = (await PremiumPlan.findOne({ _id: oid(planId), orgId: oid(user.orgId), active: true }).lean()) as unknown;
  if (!p) return { ok: false, error: 'This plan is no longer available.' };
  const plan = toPlan(p);
  if (plan.tokenPrice <= 0) return { ok: false, error: 'This plan can’t be bought with tokens.' };
  const paid = await spend(user, plan.tokenPrice, { reason: `${s.premiumName}: ${plan.name}`, refType: 'premium-plan', refId: plan.id, key: `plan:${idem}` });
  if (!paid.ok) return paid;
  try {
    const r = await grantPremium(user, { userIds: [user.id], days: plan.days, mode: 'extend', note: `Bought “${plan.name}” with ${plan.tokenPrice} ${s.tokenName}`, source: 'tokens' });
    if (!r.changed) throw new Error('not granted');
  } catch (e) {
    console.error('[premium] plan purchase failed, refunding', e);
    await refund(user, plan.tokenPrice, `Refund: ${plan.name}`, 'premium-plan', plan.id);
    return { ok: false, error: 'Could not activate Premium — your tokens were returned.' };
  }
  await auditBy(user, 'tokens.purchase', `Bought ${s.premiumName} “${plan.name}” for ${plan.tokenPrice}`, [user.id], { planId: plan.id });
  return { ok: true };
}
