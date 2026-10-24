// =============================================================================
// FILE: lib/theme-config.ts
// NEW FILE. Theme types, default theme ("Sunrise" = cream/black design),
// 5 presets, font options and Google-Font helper. Client-safe (no mongoose).
// =============================================================================

// Shared theme types, defaults and presets.
// Client-safe (no mongoose import) so SettingsForm can use the presets directly.

import { DEFAULT_MEMBER_ID_FORMAT } from './member-id';
import { GENERATED_PRESETS, HIGH_CONTRAST } from './theme-presets';

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
};

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
  { label: 'Poppins', value: 'Poppins, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", ui-sans-serif, system-ui, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' },
  { label: 'System', value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Georgia', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

const GOOGLE_FONTS: Record<string, string> = {
  Poppins: 'Poppins:wght@400;500;600;700',
  Inter: 'Inter:wght@400;500;600;700',
  'DM Sans': 'DM+Sans:wght@400;500;600;700',
  'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;500;600;700',
};

/** Google Fonts stylesheet for the first family in a font stack, or null for system fonts. */
export function googleFontHref(font: string): string | null {
  const first = (font.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
  const spec = GOOGLE_FONTS[first];
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
      primary: '#e4572e', primaryFg: '#ffffff',
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
} as const;