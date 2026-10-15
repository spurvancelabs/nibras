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

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

export default models.Setting || model('Setting', SettingSchema);