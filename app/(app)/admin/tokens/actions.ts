'use server';

// =============================================================================
// FILE: app/(app)/admin/tokens/actions.ts   (NEW FILE)
// Give or remove tokens (permission "tokens.grant": Royal Admin by default,
// delegable). Large adjustments need identity confirmation.
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireRole, hasPermission } from '@/lib/auth-helpers';
import { adminAdjust } from '@/lib/tokens';
import { requireRecentAuth, REAUTH_REQUIRED } from '@/lib/sudo';
import { getSettings } from '@/lib/settings';
import { db } from '@/lib/db';
import User from '@/models/User';
import Program from '@/models/Program';

export async function adjustTokensAction(raw: unknown): Promise<{ ok: true; changed: number; skipped: number } | { ok: false; error: string }> {
  const admin = await requireRole('admin');
  if (!(await hasPermission(admin, 'tokens.grant'))) return { ok: false, error: 'You do not have permission to give or remove tokens.' };
  const s = await getSettings();
  if (!s.tokensEnabled) return { ok: false, error: 'Tokens are switched off in Settings.' };
  const p = z
    .object({
      emails: z.string().max(20000).default(''),
      programId: z.string().refine((v) => !v || Types.ObjectId.isValid(v)).default(''),
      amount: z.number().int().min(-1_000_000).max(1_000_000),
      reason: z.string().trim().max(300).default(''),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: 'Check the form.' };
  const { emails, programId, amount, reason } = p.data;
  await db();
  let ids: string[] = [];
  if (programId) {
    const prog = (await Program.findOne({ _id: programId, orgId: admin.orgId }).select('students').lean()) as { students?: unknown[] } | null;
    ids = (prog?.students ?? []).map(String);
  }
  const list = emails
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 1000);
  if (list.length) {
    const found = (await User.find({ orgId: admin.orgId, email: { $in: list } }).select('_id').lean()) as { _id: unknown }[];
    ids.push(...found.map((u) => String(u._id)));
  }
  if (!ids.length) return { ok: false, error: 'Nobody matched those emails or that program.' };
  const total = Math.abs(amount) * ids.length;
  if ((total > 1000 || ids.length > 20) && !(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  const r = await adminAdjust(admin, ids, amount, reason);
  if (r.ok) revalidatePath('/admin/tokens');
  return r;
}
