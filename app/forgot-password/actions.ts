'use server';

// =============================================================================
// FILE: app/forgot-password/actions.ts   (NEW FILE)
// =============================================================================

import { z } from 'zod';
import { requestPasswordReset, resetPassword } from '@/lib/password-reset';

export async function requestResetAction(raw: unknown): Promise<{ ok: true }> {
  const p = z.object({ email: z.string().max(200) }).safeParse(raw);
  if (p.success) {
    try {
      await requestPasswordReset(p.data.email);
    } catch (e) {
      console.error('[password-reset] request failed', e);
    }
  }
  // Always the same answer (no account discovery).
  return { ok: true };
}

export async function resetPasswordAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ token: z.string().min(10).max(100), password: z.string().min(1).max(200), confirm: z.string().max(200) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Fill in both password fields.' };
  if (p.data.password !== p.data.confirm) return { ok: false, error: 'The two passwords don’t match.' };
  return resetPassword(p.data.token, p.data.password);
}
