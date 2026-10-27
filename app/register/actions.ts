'use server';

// =============================================================================
// FILE: app/register/actions.ts   (NEW FILE)
// =============================================================================

import { z } from 'zod';
import { register, verifyEmail } from '@/lib/registration';

export async function registerAction(raw: unknown) {
  const p = z
    .object({ name: z.string().max(100), email: z.string().max(200), password: z.string().max(200), confirm: z.string().max(200), website: z.string().max(200).optional().default('') })
    .safeParse(raw);
  if (!p.success) return { ok: false as const, error: 'Please fill in every field.' };
  if (p.data.password !== p.data.confirm) return { ok: false as const, error: 'The two passwords don’t match.' };
  try {
    return await register(p.data);
  } catch (e) {
    console.error('[register]', e);
    return { ok: false as const, error: 'Sign-up failed. Please try again.' };
  }
}

export async function verifyEmailAction(token: string) {
  return verifyEmail(String(token ?? ''));
}
