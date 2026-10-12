import { Schema, model, models } from 'mongoose';

export type ThemePalette = {
  primary: string;
  primaryFg: string;
  bg: string;
  surface: string;
  border: string;
  muted: string;
  text: string;
  success: string;
  warning: string;
  danger: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeSettings = {
  orgName: string;
  logo: string;
  favicon: string;

  themeMode: ThemeMode; // org-wide default
  light: ThemePalette;
  dark: ThemePalette;

  radiusMd: string;
  radiusLg: string;
  font: string;

  contactEmail: string;
  supportUrl: string;
};

export const DEFAULT_LIGHT: ThemePalette = {
  primary: '#2563eb',
  primaryFg: '#ffffff',
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  muted: '#64748b',
  text: '#0f172a',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

export const DEFAULT_DARK: ThemePalette = {
  primary: '#60a5fa',
  primaryFg: '#0f172a',
  bg: '#0b1220',
  surface: '#111827',
  border: '#1f2937',
  muted: '#94a3b8',
  text: '#e5e7eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const DEFAULT_SETTINGS: ThemeSettings = {
  orgName: 'LMS',
  logo: '',
  favicon: '',

  themeMode: 'system',
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,

  radiusMd: '8px',
  radiusLg: '12px',
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',

  contactEmail: '',
  supportUrl: '',
};

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
  },
  { _id: false }
);

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },

    orgName: { type: String, default: DEFAULT_SETTINGS.orgName },
    logo: { type: String, default: '' },
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

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false }
);

export default models.Setting || model('Setting', SettingSchema);