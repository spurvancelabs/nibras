// =============================================================================
// FILE: lib/theme-config.ts
// NEW FILE. Theme types, default theme ("Sunrise" = cream/black design),
// 5 presets, font options and Google-Font helper. Client-safe (no mongoose).
// =============================================================================

// Shared theme types, defaults and presets.
// Client-safe (no mongoose import) so SettingsForm can use the presets directly.

import { DEFAULT_MEMBER_ID_FORMAT } from './member-id';
import { GENERATED_PRESETS, HIGH_CONTRAST } from './theme-presets';
import type { SceneId } from './theme-scenes';
import { UI_FONTS, googleSpecForStack } from './ui-fonts';

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
  /** Hero / highlight band background (the cream area in the default theme). */
  heroBg: string;
  /** Soft decorative colour: blobs, icon tiles, avatar rings. */
  accent: string;
  /** Gradient end colour (optional; readable with primaryFg). */
  primary2?: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeSettings = {
  orgName: string;
  logo: string;
  /** Logo height in px (landing navbar, sidebar, login). */
  logoHeight: number;
  favicon: string;

  themeMode: ThemeMode; // org-wide default
  light: ThemePalette;
  dark: ThemePalette;

  radiusMd: string;
  radiusLg: string;
  font: string;

  contactEmail: string;
  supportUrl: string;

  // Landing page content
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  partnersTitle: string;
  partnersText: string;
  partnerLogos: string[];

  // Members
  /** When true, every user must have a member ID (manual + import). */
  memberIdRequired: boolean;
  /** Default format for generated member IDs, e.g. NIB-{YYYY}-{####}. */
  memberIdFormat: string;

  // Theme extras
  /** Id of the preset last applied (for highlighting in the picker). */
  themePresetId: string;
  /** Let each user pick a personal theme on their Profile page. */
  allowUserThemes: boolean;

  // Features (switch whole sections on/off)
  featureQuizzes: boolean;
  featureCertificates: boolean;
  featureSyllabus: boolean;
  featureQueries: boolean;
  featureGradebook: boolean;

  // Announcement banner shown at the top of every page
  announcementEnabled: boolean;
  announcementText: string;
  announcementTone: AnnouncementTone;
  announcementLink: string;
  announcementAudience: 'all' | 'student' | 'mentor' | 'admin';

  /** Short note shown under the sign-in form. */
  loginNotice: string;

  // Certificates (defaults; programs can override the title/signatory)
  certIssuerName: string;
  certSignatoryName: string;
  certSignatoryTitle: string;
  certSignatureImage: string;
  certPrefix: string;
  certFooterText: string;

  // Maintenance (royal admins only): students & mentors see a notice page
  maintenanceMode: boolean;
  maintenanceMessage: string;

  // Design style (lib/ui-styles.ts) + scene art
  /** Organisation design style id ('classic' = original look). */
  uiStyle: string;
  /** Let each user pick a personal design style. */
  allowUserStyles: boolean;
  /** Show the illustrated background of Deluxe / Anime themes. */
  showScene: boolean;
  /** Optional artwork (your own / licensed) shown on the dashboard & sign-in page. */
  heroArt: string;

  // Security
  /** Two-step sign-in: 'off' | 'optional' | 'admins' (required for admins) | 'staff' (admins + mentors) | 'all'. */
  twoFactorPolicy: TwoFactorPolicy;
  /** Sign everyone out after this many hours (1–2160). */
  sessionMaxHours: number;
  /** Minimum length for passwords people choose themselves (8–64). */
  passwordMinLength: number;
  /** In-app alert when someone signs in from a new network. */
  newSignInAlerts: boolean;
};

export type TwoFactorPolicy = 'off' | 'optional' | 'admins' | 'staff' | 'all';
export const TWO_FACTOR_POLICIES: TwoFactorPolicy[] = ['off', 'optional', 'admins', 'staff', 'all'];

export type AnnouncementTone = 'info' | 'success' | 'warning' | 'danger';

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  /** Group shown in the theme picker. */
  category?: string;
  light: ThemePalette;
  dark: ThemePalette;
  font: string;
  radiusMd: string;
  radiusLg: string;
  /** Illustrated background (Deluxe / Anime Deluxe themes). */
  scene?: SceneId;
  /** Recommended design style id. */
  uiStyle?: string;
};

/** Allowed logo height range (px) for the Settings slider. */
export const LOGO_MIN = 16;
export const LOGO_MAX = 80;

export function clampLogoHeight(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 32;
  return Math.min(LOGO_MAX, Math.max(LOGO_MIN, n));
}

const STATUS_LIGHT = { success: '#16a34a', warning: '#d97706', danger: '#dc2626' };
const STATUS_DARK = { success: '#22c55e', warning: '#f59e0b', danger: '#f87171' };

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export const FONT_OPTIONS = [
  { label: 'Poppins', value: UI_FONTS.poppins.css },
  { label: 'Inter', value: UI_FONTS.inter.css },
  { label: 'DM Sans', value: UI_FONTS.dm.css },
  { label: 'Plus Jakarta Sans', value: UI_FONTS.jakarta.css },
  { label: 'Nunito', value: UI_FONTS.nunito.css },
  { label: 'Quicksand', value: UI_FONTS.quicksand.css },
  { label: 'Lexend', value: UI_FONTS.lexend.css },
  { label: 'Manrope', value: UI_FONTS.manrope.css },
  { label: 'Sora', value: UI_FONTS.sora.css },
  { label: 'Outfit', value: UI_FONTS.outfit.css },
  { label: 'Urbanist', value: UI_FONTS.urbanist.css },
  { label: 'Roboto', value: UI_FONTS.roboto.css },
  { label: 'M PLUS Rounded', value: UI_FONTS.mplusRounded.css },
  { label: 'Lora (serif)', value: UI_FONTS.lora.css },
  { label: 'System', value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Georgia', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

/** Google Font spec for a font stack (null for system fonts). */
export function googleFontSpec(font: string): string | null {
  return googleSpecForStack(font);
}

/** Google Fonts stylesheet for the first family in a font stack, or null for system fonts. */
export function googleFontHref(font: string): string | null {
  const spec = googleSpecForStack(font);
  return spec ? `https://fonts.googleapis.com/css2?family=${spec}&display=swap` : null;
}

// ---------------------------------------------------------------------------
// Presets — "sunrise" is the default (the cream / black design)
// ---------------------------------------------------------------------------

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sunrise',
    category: 'Signature',
    name: 'Sunrise',
    description: 'Warm cream with ink-black buttons (default)',
    font: FONT_OPTIONS[0].value,
    radiusMd: '8px',
    radiusLg: '16px',
    light: {
      primary: '#1b1b1b', primaryFg: '#ffffff',
      bg: '#ffffff', surface: '#ffffff', border: '#ece5c9',
      muted: '#6e6a5e', text: '#1b1b1b',
      heroBg: '#fff6d1', accent: '#eadfb4',
      ...STATUS_LIGHT,
    },
    dark: {
      primary: '#ffe7a0', primaryFg: '#1b1b1b',
      bg: '#121211', surface: '#1b1a17', border: '#2f2b20',
      muted: '#a9a38f', text: '#f6f1df',
      heroBg: '#1d1b14', accent: '#3b3524',
      ...STATUS_DARK,
    },
  },
  {
    id: 'ocean',
    category: 'Signature',
    name: 'Ocean',
    description: 'Clean blue, classic SaaS',
    font: FONT_OPTIONS[1].value,
    radiusMd: '8px',
    radiusLg: '12px',
    light: {
      primary: '#2563eb', primaryFg: '#ffffff',
      bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0',
      muted: '#64748b', text: '#0f172a',
      heroBg: '#eef4ff', accent: '#dbe7fe',
      ...STATUS_LIGHT,
    },
    dark: {
      primary: '#60a5fa', primaryFg: '#0f172a',
      bg: '#0b1220', surface: '#111827', border: '#1f2937',
      muted: '#94a3b8', text: '#e5e7eb',
      heroBg: '#0f1a2e', accent: '#1e3a5f',
      ...STATUS_DARK,
    },
  },
  {
    id: 'forest',
    category: 'Signature',
    name: 'Forest',
    description: 'Calm green, academic feel',
    font: FONT_OPTIONS[2].value,
    radiusMd: '8px',
    radiusLg: '14px',
    light: {
      primary: '#166534', primaryFg: '#ffffff',
      bg: '#ffffff', surface: '#ffffff', border: '#dfeee3',
      muted: '#5b6b61', text: '#10241a',
      heroBg: '#ecf7ef', accent: '#cfe9d7',
      ...STATUS_LIGHT,
    },
    dark: {
      primary: '#4ade80', primaryFg: '#06210f',
      bg: '#0b1410', surface: '#111c16', border: '#1f2f25',
      muted: '#94a89b', text: '#e6f2ea',
      heroBg: '#0f1f16', accent: '#1d3a28',
      ...STATUS_DARK,
    },
  },
  {
    id: 'plum',
    category: 'Signature',
    name: 'Plum',
    description: 'Creative violet',
    font: FONT_OPTIONS[3].value,
    radiusMd: '10px',
    radiusLg: '18px',
    light: {
      primary: '#6d28d9', primaryFg: '#ffffff',
      bg: '#ffffff', surface: '#ffffff', border: '#ebe5f7',
      muted: '#6b6480', text: '#1e1530',
      heroBg: '#f4efff', accent: '#e4d9fd',
      ...STATUS_LIGHT,
    },
    dark: {
      primary: '#a78bfa', primaryFg: '#170f2b',
      bg: '#110d1a', surface: '#181324', border: '#2a2338',
      muted: '#a59fba', text: '#ede9f7',
      heroBg: '#1a1428', accent: '#2e2448',
      ...STATUS_DARK,
    },
  },
  {
    id: 'coral',
    category: 'Signature',
    name: 'Coral',
    description: 'Energetic orange-red',
    font: FONT_OPTIONS[0].value,
    radiusMd: '8px',
    radiusLg: '16px',
    light: {
      primary: '#c4421b', primaryFg: '#ffffff',
      bg: '#ffffff', surface: '#ffffff', border: '#f2e4dd',
      muted: '#75645d', text: '#24140f',
      heroBg: '#fff1eb', accent: '#fbd9cb',
      ...STATUS_LIGHT,
    },
    dark: {
      primary: '#ff8a65', primaryFg: '#2a0f06',
      bg: '#140f0d', surface: '#1d1613', border: '#33241e',
      muted: '#b39f97', text: '#f7ece7',
      heroBg: '#211612', accent: '#40271d',
      ...STATUS_DARK,
    },
  },
];

// The original 5 stay first (ids unchanged), then 110+ generated presets.
THEME_PRESETS.push(
  ...GENERATED_PRESETS.filter((g) => !THEME_PRESETS.some((p) => p.id === g.id)),
  HIGH_CONTRAST
);

/** Category names in display order. */
export const THEME_CATEGORY_NAMES: string[] = Array.from(
  new Set(THEME_PRESETS.map((p) => p.category ?? 'Other'))
);

export function findPreset(id: string | null | undefined): ThemePreset | undefined {
  return id ? THEME_PRESETS.find((p) => p.id === id) : undefined;
}

const SUNRISE = THEME_PRESETS[0];

export const DEFAULT_LIGHT: ThemePalette = { ...SUNRISE.light };
export const DEFAULT_DARK: ThemePalette = { ...SUNRISE.dark };

export const DEFAULT_SETTINGS: ThemeSettings = {
  orgName: 'LMS',
  logo: '',
  logoHeight: 32,
  favicon: '',

  themeMode: 'light',
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,

  radiusMd: SUNRISE.radiusMd,
  radiusLg: SUNRISE.radiusLg,
  font: SUNRISE.font,

  contactEmail: '',
  supportUrl: '',

  heroTitle: '',
  heroSubtitle: '',
  heroImage: '',
  partnersTitle: 'Trusted by',
  partnersText: '',
  partnerLogos: [],

  memberIdRequired: false,
  memberIdFormat: DEFAULT_MEMBER_ID_FORMAT,

  themePresetId: 'sunrise',
  allowUserThemes: true,

  featureQuizzes: true,
  featureCertificates: true,
  featureSyllabus: true,
  featureQueries: true,
  featureGradebook: true,

  announcementEnabled: false,
  announcementText: '',
  announcementTone: 'info',
  announcementLink: '',
  announcementAudience: 'all',

  loginNotice: '',

  certIssuerName: '',
  certSignatoryName: '',
  certSignatoryTitle: 'Program Director',
  certSignatureImage: '',
  certPrefix: 'CERT',
  certFooterText: '',

  maintenanceMode: false,
  maintenanceMessage: 'We are doing some maintenance. Please check back shortly.',

  uiStyle: 'classic',
  allowUserStyles: true,
  showScene: true,
  heroArt: '',

  twoFactorPolicy: 'optional',
  sessionMaxHours: 720,
  passwordMinLength: 8,
  newSignInAlerts: true,
};

/** Boolean settings and their defaults (used when reading old documents). */
export const BOOLEAN_SETTING_DEFAULTS = {
  allowUserThemes: true,
  featureQuizzes: true,
  featureCertificates: true,
  featureSyllabus: true,
  featureQueries: true,
  featureGradebook: true,
  announcementEnabled: false,
  maintenanceMode: false,
  memberIdRequired: false,
  allowUserStyles: true,
  showScene: true,
  newSignInAlerts: true,
} as const;

/** Numeric settings: [min, max, default]. */
export const NUMBER_SETTING_LIMITS = {
  sessionMaxHours: [1, 2160, 720],
  passwordMinLength: [8, 64, 8],
} as const;

export function clampSettingNumber(key: keyof typeof NUMBER_SETTING_LIMITS, v: unknown): number {
  const [min, max, def] = NUMBER_SETTING_LIMITS[key];
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}