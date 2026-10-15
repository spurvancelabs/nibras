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
import { clampLogoHeight } from '@/lib/theme-config';

function mergePalette(
  base: ThemePalette,
  patch: Partial<ThemePalette> | undefined
): ThemePalette {
  return { ...base, ...(patch ?? {}) };
}

function mergeSettings(doc: Record<string, unknown> | null): ThemeSettings {
  const d = doc ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    light: mergePalette(DEFAULT_LIGHT, d.light as Partial<ThemePalette> | undefined),
    dark: mergePalette(DEFAULT_DARK, d.dark as Partial<ThemePalette> | undefined),
    logoHeight: clampLogoHeight(d.logoHeight ?? DEFAULT_SETTINGS.logoHeight),
    partnerLogos: Array.isArray(d.partnerLogos)
      ? (d.partnerLogos as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
  } as ThemeSettings;
}

async function fetchSettings(): Promise<ThemeSettings> {
  try {
    await db();
    const doc = await Setting.findOne({ key: 'global' }).lean();
    return mergeSettings(doc as Record<string, unknown> | null);
  } catch (err) {
    console.error('[settings] fetch failed, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export const getSettings = unstable_cache(fetchSettings, ['global-settings'], {
  tags: ['settings'],
  revalidate: 3600,
});

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
    } else if (k === 'logoHeight') {
      clean[k] = clampLogoHeight(v);
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
    // Next.js 16+ requires two arguments for revalidateTag
    const { revalidateTag } = await import('next/cache');
    revalidateTag('settings', 'max');
  } catch (error) {
    console.warn('Failed to revalidate settings tag:', error);
  }
  return mergeSettings(doc as Record<string, unknown> | null);
}