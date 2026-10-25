// =============================================================================
// FILE: app/(app)/admin/settings/actions.ts
// Server action used by SettingsForm to validate (zod) and save Settings.
// Includes the new palette keys (heroBg, accent), landing-page fields, logo size
// and member ID rules (memberIdRequired, memberIdFormat).
// =============================================================================

'use server';

import { z } from 'zod';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { updateSettings, getSettings } from '@/lib/settings';
import { audit } from '@/lib/audit';
import { DEFAULT_LIGHT } from '@/lib/theme-config';
import { findUiStyle } from '@/lib/ui-styles';
import { DEFAULT_MEMBER_ID_FORMAT, validateMemberIdFormat } from '@/lib/member-id';

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
  primary2: z.string().max(200).optional().default(''),
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

  // Members
  memberIdRequired: z.boolean().optional().default(false),
  memberIdFormat: z
    .string()
    .max(40)
    .optional()
    .default(DEFAULT_MEMBER_ID_FORMAT)
    .refine((v) => validateMemberIdFormat(v) === null, {
      message: 'Member ID format is invalid — e.g. MEM-{YYYY}-{####}',
    }),

  // Theme extras
  themePresetId: z.string().max(60).optional().default(''),
  allowUserThemes: z.boolean().optional().default(true),

  // Features
  featureQuizzes: z.boolean().optional().default(true),
  featureCertificates: z.boolean().optional().default(true),
  featureSyllabus: z.boolean().optional().default(true),
  featureQueries: z.boolean().optional().default(true),
  featureGradebook: z.boolean().optional().default(true),

  // Announcement
  announcementEnabled: z.boolean().optional().default(false),
  announcementText: z.string().max(280, 'Announcement is too long (max 280)').optional().default(''),
  announcementTone: z.enum(['info', 'success', 'warning', 'danger']).optional().default('info'),
  announcementLink: z
    .string()
    .max(300)
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v) || /^\/[^\s/][^\s]*$/.test(v), {
      message: 'Announcement link must be a full URL or a page path like /quizzes',
    })
    .optional()
    .default(''),
  announcementAudience: z.enum(['all', 'student', 'mentor', 'admin']).optional().default('all'),

  loginNotice: z.string().max(300, 'Login notice is too long (max 300)').optional().default(''),

  // Certificates
  certIssuerName: z.string().max(120).optional().default(''),
  certSignatoryName: z.string().max(80).optional().default(''),
  certSignatoryTitle: z.string().max(80).optional().default('Program Director'),
  certSignatureImage: urlOrEmpty,
  certPrefix: z
    .string()
    .max(12)
    .regex(/^[A-Za-z0-9-]*$/, 'Certificate prefix: letters, numbers and - only')
    .optional()
    .default('CERT'),
  certFooterText: z.string().max(200).optional().default(''),

  // Maintenance (royal only)
  maintenanceMode: z.boolean().optional().default(false),
  maintenanceMessage: z.string().max(300).optional().default(''),

  // Appearance
  uiStyle: z
    .string()
    .max(60)
    .optional()
    .default('classic')
    .refine((v) => !!findUiStyle(v), { message: 'Unknown design style' }),
  allowUserStyles: z.boolean().optional().default(true),
  showScene: z.boolean().optional().default(true),
  heroArt: urlOrEmpty,

  // Security (royal only when changed)
  twoFactorPolicy: z.enum(['off', 'optional', 'admins', 'staff', 'all']).optional().default('optional'),
  sessionMaxHours: z.coerce.number().int().min(1, 'Session length must be at least 1 hour').max(2160, 'Session length can be at most 90 days').optional().default(720),
  passwordMinLength: z.coerce.number().int().min(8, 'Minimum password length is 8').max(64).optional().default(8),
  newSignInAlerts: z.boolean().optional().default(true),
});

/** Settings that weaken or tighten sign-in for everyone — royal admins only. */
const SECURITY_KEYS = ['twoFactorPolicy', 'sessionMaxHours', 'passwordMinLength', 'newSignInAlerts'] as const;

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

  const before = await getSettings();
  const data = { ...parsed.data, certPrefix: (parsed.data.certPrefix || 'CERT').toUpperCase() };

  // Maintenance mode locks students & mentors out — royal admins only.
  if (
    (data.maintenanceMode !== before.maintenanceMode || data.maintenanceMessage !== before.maintenanceMessage) &&
    !(await isRoyal(admin))
  ) {
    return { ok: false, error: 'Only a royal admin can change maintenance mode.' };
  }

  if (
    SECURITY_KEYS.some((k) => JSON.stringify(data[k]) !== JSON.stringify(before[k])) &&
    !(await isRoyal(admin))
  ) {
    return { ok: false, error: 'Only a royal admin can change the security settings.' };
  }

  const changed = Object.keys(data).filter(
    (k) => JSON.stringify((data as Record<string, unknown>)[k]) !== JSON.stringify((before as Record<string, unknown>)[k])
  );

  try {
    await updateSettings(data, admin.id);
    if (changed.length) {
      await audit({
        orgId: admin.orgId,
        action: 'settings.update',
        actorId: admin.id,
        actorEmail: admin.email ?? '',
        actorName: admin.name ?? '',
        summary: `Changed: ${changed.slice(0, 12).join(', ')}${changed.length > 12 ? ` +${changed.length - 12} more` : ''}`,
        meta: { changed },
      });
    }
    return { ok: true };
  } catch (e) {
    console.error('[saveSettings]', e);
    return { ok: false, error: 'Failed to save settings' };
  }
}