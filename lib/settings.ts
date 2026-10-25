// =============================================================================
// FILE: lib/settings.ts
// Server-only helpers: getSettings() (cached) and updateSettings().
// =============================================================================

import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import Setting, {
  DEFAULT_SETTINGS,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  type ThemeSettings,
  type ThemePalette,
} from '@/models/Setting';
import {
  clampLogoHeight,
  clampSettingNumber,
  BOOLEAN_SETTING_DEFAULTS,
  NUMBER_SETTING_LIMITS,
  TWO_FACTOR_POLICIES,
} from '@/lib/theme-config';
import { findUiStyle, DEFAULT_UI_STYLE_ID } from '@/lib/ui-styles';

function mergePalette(
  base: ThemePalette,
  patch: Partial<ThemePalette> | undefined
): ThemePalette {
  return { ...base, ...(patch ?? {}) };
}

function mergeSettings(doc: Record<string, unknown> | null): ThemeSettings {
  const d = doc ?? {};
  const bools: Record<string, boolean> = {};
  for (const [k, def] of Object.entries(BOOLEAN_SETTING_DEFAULTS)) {
    bools[k] = typeof d[k] === 'boolean' ? (d[k] as boolean) : def;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    light: mergePalette(DEFAULT_LIGHT, d.light as Partial<ThemePalette> | undefined),
    dark: mergePalette(DEFAULT_DARK, d.dark as Partial<ThemePalette> | undefined),
    logoHeight: clampLogoHeight(d.logoHeight ?? DEFAULT_SETTINGS.logoHeight),
    memberIdRequired: d.memberIdRequired === true,
    memberIdFormat:
      typeof d.memberIdFormat === 'string' && d.memberIdFormat.trim()
        ? d.memberIdFormat
        : DEFAULT_SETTINGS.memberIdFormat,
    partnerLogos: Array.isArray(d.partnerLogos)
      ? (d.partnerLogos as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    ...bools,
    uiStyle: typeof d.uiStyle === 'string' && findUiStyle(d.uiStyle) ? d.uiStyle : DEFAULT_UI_STYLE_ID,
    heroArt: typeof d.heroArt === 'string' ? d.heroArt : '',
    twoFactorPolicy: TWO_FACTOR_POLICIES.includes(d.twoFactorPolicy as never)
      ? (d.twoFactorPolicy as ThemeSettings['twoFactorPolicy'])
      : DEFAULT_SETTINGS.twoFactorPolicy,
    sessionMaxHours: clampSettingNumber('sessionMaxHours', d.sessionMaxHours ?? DEFAULT_SETTINGS.sessionMaxHours),
    passwordMinLength: clampSettingNumber('passwordMinLength', d.passwordMinLength ?? DEFAULT_SETTINGS.passwordMinLength),
  } as ThemeSettings;
}

async function fetchSettings(): Promise<ThemeSettings> {
  // Errors are thrown (not turned into defaults) so a failed read is never
  // cached — the next request simply tries the database again.
  await db();
  const doc = await Setting.findOne({ key: 'global' }).lean();
  return mergeSettings(doc as Record<string, unknown> | null);
}

const cachedSettings = unstable_cache(fetchSettings, ['global-settings', 'v2'], {
  tags: ['settings'],
  revalidate: 3600,
});

/**
 * Cached settings. The cached value is merged with the defaults again on every
 * read, so a cache entry written by an older version of the app (missing new
 * fields) can never produce `undefined` settings after a deploy.
 */
export async function getSettings(): Promise<ThemeSettings> {
  try {
    return mergeSettings((await cachedSettings()) as unknown as Record<string, unknown>);
  } catch (err) {
    // Database unreachable: keep the site up with the default look (not cached).
    console.error('[settings] fetch failed, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(
  patch: Partial<ThemeSettings>,
  updatedBy?: string
): Promise<ThemeSettings> {
  await db();

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'light' || k === 'dark') {
      clean[k] = v; // whole palette replaced
    } else if (k === 'partnerLogos' && Array.isArray(v)) {
      clean[k] = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 12);
    } else if (k in BOOLEAN_SETTING_DEFAULTS) {
      clean[k] = v === true;
    } else if (k === 'logoHeight') {
      clean[k] = clampLogoHeight(v);
    } else if (k in NUMBER_SETTING_LIMITS) {
      clean[k] = clampSettingNumber(k as keyof typeof NUMBER_SETTING_LIMITS, v);
    } else if (typeof v === 'string') {
      clean[k] = v;
    }
  }
  if (updatedBy) clean.updatedBy = updatedBy;

  const doc = await Setting.findOneAndUpdate(
    { key: 'global' },
    { $set: clean, $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, lean: true }
  );

  try {
    // Immediate refresh inside Server Actions (updateTag); elsewhere expire now.
    const mod = await import('next/cache');
    try {
      mod.updateTag('settings');
    } catch {
      mod.revalidateTag('settings', { expire: 0 });
    }
  } catch (error) {
    console.warn('Failed to revalidate settings tag:', error);
  }
  return mergeSettings(doc as Record<string, unknown> | null);
}