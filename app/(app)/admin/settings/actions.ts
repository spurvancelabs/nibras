'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth-helpers';
import { updateSettings } from '@/lib/settings';

const paletteSchema = z.object({
  primary: z.string().min(1).max(200),
  primaryFg: z.string().min(1).max(200),
  bg: z.string().min(1).max(200),
  surface: z.string().min(1).max(200),
  border: z.string().min(1).max(200),
  muted: z.string().min(1).max(200),
  text: z.string().min(1).max(200),
  success: z.string().min(1).max(200),
  warning: z.string().min(1).max(200),
  danger: z.string().min(1).max(200),
});

const schema = z.object({
  orgName: z.string().min(1).max(80),
  logo: z.string().max(500).optional().default(''),
  favicon: z.string().max(500).optional().default(''),

  themeMode: z.enum(['light', 'dark', 'system']),
  light: paletteSchema,
  dark: paletteSchema,

  radiusMd: z.string().min(1).max(20),
  radiusLg: z.string().min(1).max(20),
  font: z.string().min(1).max(200),

  contactEmail: z.string().max(120).optional().default(''),
  supportUrl: z.string().max(300).optional().default(''),
});

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveSettings(
  raw: unknown
): Promise<SettingsActionResult> {
  const admin = await requireRole('admin');

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  try {
    await updateSettings(parsed.data, admin.id);
    return { ok: true };
  } catch (e) {
    console.error('[saveSettings]', e);
    return { ok: false, error: 'Failed to save settings' };
  }
}