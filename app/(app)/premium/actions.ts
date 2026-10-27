'use server';

// =============================================================================
// FILE: app/(app)/premium/actions.ts   (NEW FILE)
// Redeem a premium code (rate-limited, atomic, audited — see lib/premium.ts).
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { redeemCode } from '@/lib/premium';

export async function redeemCodeAction(raw: unknown): Promise<{ ok: true; until: string } | { ok: false; error: string }> {
  const user = await requireAuth();
  const parsed = z.object({ code: z.string().trim().min(4).max(40) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Enter your code' };
  const s = await getSettings();
  const r = await redeemCode(user, parsed.data.code, s.premiumEnabled === true);
  if (r.ok) revalidatePath('/', 'layout');
  return r;
}

export async function buyPlanAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireAuth();
  const parsed = z.object({ planId: z.string().max(40), idem: z.string().max(64) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  const { buyPlan } = await import('@/lib/premium-plans');
  const r = await buyPlan(user, parsed.data.planId, parsed.data.idem);
  if (r.ok) revalidatePath('/', 'layout');
  return r.ok ? { ok: true } : r;
}
