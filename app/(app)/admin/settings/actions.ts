// =============================================================================
// FILE: app/(app)/admin/settings/actions.ts
// Server action used by SettingsForm to validate (zod) and save Settings.
// Includes the new palette keys (heroBg, accent), landing-page fields and logo size.
// =============================================================================

'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth-helpers';
import { updateSettings } from '@/lib/settings';
import { DEFAULT_LIGHT } from '@/lib/theme-config';

const color = z.string().min(1).max(200);

const paletteSchema = z.object({
  primary: color,
  primaryFg: color,
  bg: color,
  surface: color,
  border: color,
  muted: color,
  text: color,
  success: color,
  warning: color,
  danger: color,
  // New keys — optional so older saved palettes still validate
  heroBg: color.optional().default(DEFAULT_LIGHT.heroBg),
  accent: color.optional().default(DEFAULT_LIGHT.accent),
});

const urlOrEmpty = z
  .string()
  .max(300)
  .refine(
    (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
    { message: 'Must be a valid URL starting with http:// or https://' }
  )
  .optional()
  .default('');

const schema = z.object({
  orgName: z.string().min(1).max(80),
  logo: z.string().max(500).optional().default(''),
  favicon: z.string().max(500).optional().default(''),
  logoHeight: z.coerce
    .number()
    .int()
    .min(16, 'Logo size must be at least 16px')
    .max(80, 'Logo size can be at most 80px')
    .optional()
    .default(32),

  themeMode: z.enum(['light', 'dark', 'system']),
  light: paletteSchema,
  dark: paletteSchema,

  radiusMd: z.string().min(1).max(20),
  radiusLg: z.string().min(1).max(20),
  font: z.string().min(1).max(200),

  contactEmail: z.string().max(120).optional().default(''),
  supportUrl: urlOrEmpty,

  // Landing page
  heroTitle: z.string().max(90, 'Headline is too long (max 90)').optional().default(''),
  heroSubtitle: z.string().max(260, 'Sub-text is too long (max 260)').optional().default(''),
  heroImage: urlOrEmpty,
  partnersTitle: z.string().max(60).optional().default('Trusted by'),
  partnersText: z.string().max(200).optional().default(''),
  partnerLogos: z
    .array(z.string().regex(/^https?:\/\/\S+$/i, 'Partner logo must be a URL'))
    .max(12, 'Maximum 12 partner logos')
    .optional()
    .default([]),
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