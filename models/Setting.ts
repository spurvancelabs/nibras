// =============================================================================
// FILE: models/Setting.ts
// Mongoose model for global Settings (theme + landing content + member ID rules).
// Types/defaults live in lib/theme-config.ts and are re-exported from here.
// =============================================================================

import { Schema, model, models } from 'mongoose';
import {
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  DEFAULT_SETTINGS,
  type ThemePalette,
} from '../lib/theme-config';

// Types, defaults and presets live in lib/theme-config (client-safe).
// Re-exported here so existing imports from '@/models/Setting' keep working.
export type { ThemePalette, ThemeMode, ThemeSettings, ThemePreset } from '../lib/theme-config';
export { DEFAULT_LIGHT, DEFAULT_DARK, DEFAULT_SETTINGS, THEME_PRESETS } from '../lib/theme-config';

const PaletteSchema = new Schema<ThemePalette>(
  {
    primary: { type: String, default: DEFAULT_LIGHT.primary },
    primaryFg: { type: String, default: DEFAULT_LIGHT.primaryFg },
    bg: { type: String, default: DEFAULT_LIGHT.bg },
    surface: { type: String, default: DEFAULT_LIGHT.surface },
    border: { type: String, default: DEFAULT_LIGHT.border },
    muted: { type: String, default: DEFAULT_LIGHT.muted },
    text: { type: String, default: DEFAULT_LIGHT.text },
    success: { type: String, default: DEFAULT_LIGHT.success },
    warning: { type: String, default: DEFAULT_LIGHT.warning },
    danger: { type: String, default: DEFAULT_LIGHT.danger },
    heroBg: { type: String, default: DEFAULT_LIGHT.heroBg },
    accent: { type: String, default: DEFAULT_LIGHT.accent },
    primary2: { type: String, default: '' },
  },
  { _id: false }
);

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },

    orgName: { type: String, default: DEFAULT_SETTINGS.orgName },
    logo: { type: String, default: '' },
    logoHeight: { type: Number, default: DEFAULT_SETTINGS.logoHeight, min: 16, max: 80 },
    favicon: { type: String, default: '' },

    themeMode: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: DEFAULT_SETTINGS.themeMode,
    },
    light: { type: PaletteSchema, default: () => ({ ...DEFAULT_LIGHT }) },
    dark: { type: PaletteSchema, default: () => ({ ...DEFAULT_DARK }) },

    radiusMd: { type: String, default: DEFAULT_SETTINGS.radiusMd },
    radiusLg: { type: String, default: DEFAULT_SETTINGS.radiusLg },
    font: { type: String, default: DEFAULT_SETTINGS.font },

    contactEmail: { type: String, default: '' },
    supportUrl: { type: String, default: '' },

    // Landing page content
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    heroImage: { type: String, default: '' },
    partnersTitle: { type: String, default: DEFAULT_SETTINGS.partnersTitle },
    partnersText: { type: String, default: '' },
    partnerLogos: { type: [String], default: [] },

    // Members
    memberIdRequired: { type: Boolean, default: false },
    memberIdFormat: { type: String, default: DEFAULT_SETTINGS.memberIdFormat },

    // --- NEW (all optional with defaults; old documents need no migration) ---
    themePresetId: { type: String, default: DEFAULT_SETTINGS.themePresetId },
    allowUserThemes: { type: Boolean, default: true },
    featureQuizzes: { type: Boolean, default: true },
    featureCertificates: { type: Boolean, default: true },
    featureSyllabus: { type: Boolean, default: true },
    featureQueries: { type: Boolean, default: true },
    featureGradebook: { type: Boolean, default: true },
    announcementEnabled: { type: Boolean, default: false },
    announcementText: { type: String, default: '' },
    announcementTone: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
    announcementLink: { type: String, default: '' },
    announcementAudience: { type: String, enum: ['all', 'student', 'mentor', 'admin'], default: 'all' },
    loginNotice: { type: String, default: '' },
    certIssuerName: { type: String, default: '' },
    certSignatoryName: { type: String, default: '' },
    certSignatoryTitle: { type: String, default: DEFAULT_SETTINGS.certSignatoryTitle },
    certSignatureImage: { type: String, default: '' },
    certPrefix: { type: String, default: DEFAULT_SETTINGS.certPrefix },
    certFooterText: { type: String, default: '' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: DEFAULT_SETTINGS.maintenanceMessage },

    // Appearance (design style + scene art)
    uiStyle: { type: String, default: DEFAULT_SETTINGS.uiStyle, maxlength: 60 },
    allowUserStyles: { type: Boolean, default: true },
    showScene: { type: Boolean, default: true },
    heroArt: { type: String, default: '' },

    // Security
    twoFactorPolicy: { type: String, enum: ['off', 'optional', 'admins', 'staff', 'all'], default: 'optional' },
    sessionMaxHours: { type: Number, default: 720, min: 1, max: 2160 },
    passwordMinLength: { type: Number, default: 8, min: 8, max: 64 },
    newSignInAlerts: { type: Boolean, default: true },

    // Permission delegation + premium + attendance + AI + retention
    permissionOverrides: { type: Schema.Types.Mixed, default: () => ({}) },
    premiumEnabled: { type: Boolean, default: false },
    premiumName: { type: String, default: 'Premium', maxlength: 40 },
    premiumHowTo: { type: String, default: '', maxlength: 2000 },
    premiumPerks: { type: String, default: '', maxlength: 2000 },
    themeTiers: { type: Schema.Types.Mixed, default: () => ({ ...DEFAULT_SETTINGS.themeTiers }) },
    themeOverrides: { type: Schema.Types.Mixed, default: () => ({}) },
    styleTiers: { type: Schema.Types.Mixed, default: () => ({ ...DEFAULT_SETTINGS.styleTiers }) },
    styleOverrides: { type: Schema.Types.Mixed, default: () => ({}) },
    attendanceThreshold: { type: Number, default: 75, min: 0, max: 100 },
    absenceStreakAlert: { type: Number, default: 3, min: 0, max: 20 },
    attendanceAlerts: { type: Boolean, default: true },
    aiGradingEnabled: { type: Boolean, default: false },
    aiMonthlyLimit: { type: Number, default: 500, min: 0, max: 100000 },
    aiMaxChars: { type: Number, default: 12000, min: 1000, max: 50000 },
    auditRetentionDays: { type: Number, default: 365, min: 30, max: 3650 },
    notificationRetentionDays: { type: Number, default: 180, min: 14, max: 3650 },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

export default models.Setting || model('Setting', SettingSchema);