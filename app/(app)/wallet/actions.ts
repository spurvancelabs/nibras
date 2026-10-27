'use server';

// =============================================================================
// FILE: app/(app)/wallet/actions.ts   (NEW FILE)
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { transfer } from '@/lib/tokens';

export async function sendTokensAction(raw: unknown): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const user = await requireAuth();
  const p = z.object({ email: z.string().trim().email().max(200), amount: z.number().int().min(1).max(1_000_000), note: z.string().trim().max(200).default('') }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Check the email and amount.' };
  const r = await transfer(user, p.data.email, p.data.amount, p.data.note);
  if (r.ok) revalidatePath('/wallet');
  return r;
}
