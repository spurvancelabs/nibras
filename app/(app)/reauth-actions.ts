'use server';

// =============================================================================
// FILE: app/(app)/reauth-actions.ts   (NEW FILE)
// Confirm your identity (password + 2FA code if enabled) to unlock
// high-impact actions for 10 minutes. Rate-limited and audited on failure.
// =============================================================================

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import User from '@/models/User';
import { hit } from '@/lib/rate-limit';
import { grantSudo } from '@/lib/sudo';
import { verifySecondFactor, twoFactorDisabledByEnv } from '@/lib/two-factor';
import { audit } from '@/lib/audit';

export async function confirmIdentityAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string; needCode?: boolean }> {
  const me = await requireAuth({ allowWithout2fa: true });
  const parsed = z.object({ password: z.string().min(1).max(200), code: z.string().max(20).optional().default('') }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Enter your password' };

  const n = await hit(`sudo:${me.id}`, 900);
  if (n > 8) return { ok: false, error: 'Too many attempts. Please wait 15 minutes.' };

  await db();
  const u = (await User.findOne({ _id: me.id, orgId: me.orgId }).select('+passwordHash twoFactorEnabled sessionVersion').lean()) as
    | { passwordHash?: string; twoFactorEnabled?: boolean; sessionVersion?: number }
    | null;
  if (!u?.passwordHash) return { ok: false, error: 'Account not found' };

  const ok = await bcrypt.compare(parsed.data.password, u.passwordHash);
  if (!ok) {
    await audit({ orgId: me.orgId, action: 'auth.reauth_failed', actorId: me.id, actorEmail: me.email ?? '', actorName: me.name ?? '', targetIds: [me.id] });
    return { ok: false, error: 'Password is incorrect' };
  }
  if (u.twoFactorEnabled && !twoFactorDisabledByEnv()) {
    if (!parsed.data.code.trim()) return { ok: false, error: 'Enter the code from your authenticator app', needCode: true };
    const v = await verifySecondFactor(me.id, parsed.data.code);
    if (v === 'invalid') return { ok: false, error: 'That code is not right', needCode: true };
  }
  await grantSudo(me.id, Number(u.sessionVersion ?? 0) || 0);
  return { ok: true };
}
