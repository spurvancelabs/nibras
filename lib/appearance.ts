// =============================================================================
// FILE: lib/appearance.ts   (NEW FILE — server + client safe, pure)
// The theme a user actually sees (personal choice if allowed and entitled,
// otherwise the organisation theme) — used to pick the matching anime
// character for the dashboard / login / Premium page.
// =============================================================================

import { findPreset, type ThemePreset, type ThemeSettings } from './theme-config';
import { themeTier, canUseTier, type EntitlementPolicy, type EntitledUser } from './entitlements';
import { SCENE_CHARACTER, type CharacterId } from '@/components/Character';

export function effectivePreset(
  s: Pick<ThemeSettings, 'allowUserThemes' | 'themePresetId'>,
  policy: EntitlementPolicy,
  user?: (EntitledUser & { themePreset?: string }) | null
): ThemePreset | undefined {
  const personal = user && s.allowUserThemes ? findPreset(user.themePreset) : undefined;
  if (personal && canUseTier(themeTier(personal, policy), user, policy)) return personal;
  return findPreset(s.themePresetId);
}

/** Character for the theme's illustrated scene, or null for plain themes / scenes off. */
export function characterFor(preset: ThemePreset | undefined, showScene: boolean): CharacterId | null {
  if (!preset?.scene || !showScene) return null;
  if (preset.category !== 'Anime Deluxe') return null;
  return SCENE_CHARACTER[preset.scene] ?? null;
}
