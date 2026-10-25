// =============================================================================
// FILE: lib/theme-css.ts
// Builds the CSS that applies a colour theme (palette + radius + font + scene)
// and a design style. Used by the root layout (organisation appearance), the
// app layout (personal appearance) and live previews.
// Admin-entered values are sanitised so they can't break out of <style>.
// =============================================================================

import type { ThemePalette, ThemePreset, ThemeSettings } from './theme-config';
import { DEFAULT_LIGHT, DEFAULT_DARK, DEFAULT_SETTINGS, findPreset, googleFontSpec } from './theme-config';
import { sceneBackground, isSceneId, type SceneId } from './theme-scenes';
import { findUiStyle, uiStyleCss, DEFAULT_UI_STYLE_ID, type UiStyle } from './ui-styles';
import { UI_FONTS, googleFontsHref } from './ui-fonts';

const css = (v: unknown, fallback: string) =>
  (typeof v === 'string' && v.trim() ? v : fallback).replace(/[<>{};]/g, '');

/** Only simple lengths are allowed for the radius (anything else → fallback). */
export function safeRadius(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^\s*\d{1,3}(\.\d{1,2})?(px|rem|em)\s*$/.test(v) ? v.trim() : fallback;
}

export function paletteVars(p: Partial<ThemePalette> | undefined, d: ThemePalette = DEFAULT_LIGHT): string {
  const v = p ?? {};
  return [
    `--color-primary:${css(v.primary, d.primary)}`,
    `--color-primary-fg:${css(v.primaryFg, d.primaryFg)}`,
    `--color-primary-2:${css(v.primary2, css(v.primary, d.primary))}`,
    `--color-bg:${css(v.bg, d.bg)}`,
    `--color-surface:${css(v.surface, d.surface)}`,
    `--color-border:${css(v.border, d.border)}`,
    `--color-muted:${css(v.muted, d.muted)}`,
    `--color-text:${css(v.text, d.text)}`,
    `--color-success:${css(v.success, d.success)}`,
    `--color-warning:${css(v.warning, d.warning)}`,
    `--color-danger:${css(v.danger, d.danger)}`,
    `--color-hero:${css(v.heroBg, d.heroBg)}`,
    `--color-accent:${css(v.accent, d.accent)}`,
  ].join(';');
}

function sceneBlock(scene: SceneId | undefined, light: ThemePalette, dark: ThemePalette): { root: string; dark: string } {
  if (!scene || !isSceneId(scene)) return { root: '--theme-scene:none', dark: '' };
  return {
    root: `--theme-scene:${sceneBackground(scene, light, false)};--theme-scene-opacity:1`,
    dark: `--theme-scene:${sceneBackground(scene, dark, true)}`,
  };
}

type ThemeInput = {
  light: Partial<ThemePalette>;
  dark: Partial<ThemePalette>;
  radiusMd: string;
  radiusLg: string;
  font: string;
  scene?: SceneId;
};

/** CSS for a complete colour theme (palette, radius, font and scene). */
export function themeCss(t: ThemeInput): string {
  const light = { ...DEFAULT_LIGHT, ...t.light } as ThemePalette;
  const dark = { ...DEFAULT_DARK, ...t.dark } as ThemePalette;
  const sc = sceneBlock(t.scene, light, dark);
  return (
    `:root{${paletteVars(light, DEFAULT_LIGHT)};` +
    `--radius-md-base:${safeRadius(t.radiusMd, '8px')};--radius-lg-base:${safeRadius(t.radiusLg, '16px')};` +
    `--font-sans:${css(t.font, DEFAULT_SETTINGS.font)};${sc.root}}` +
    `.dark{${paletteVars(dark, DEFAULT_DARK)}${sc.dark ? `;${sc.dark}` : ''}}`
  );
}

/** CSS that applies a preset (used for personal themes and live previews). */
export function presetCss(p: ThemePreset, opts: { showScene?: boolean } = {}): string {
  return themeCss({
    light: p.light,
    dark: p.dark,
    radiusMd: p.radiusMd,
    radiusLg: p.radiusLg,
    font: p.font,
    scene: opts.showScene === false ? undefined : p.scene,
  });
}

/** Organisation appearance from Settings: colour theme + design style. */
export function orgAppearanceCss(s: ThemeSettings): string {
  const preset = findPreset(s.themePresetId);
  return (
    themeCss({
      light: s.light,
      dark: s.dark,
      radiusMd: s.radiusMd,
      radiusLg: s.radiusLg,
      font: s.font,
      scene: s.showScene !== false ? preset?.scene : undefined,
    }) + uiStyleCss(findUiStyle(s.uiStyle) ?? findUiStyle(DEFAULT_UI_STYLE_ID))
  );
}

/** One Google Fonts URL for a body font stack + a design style. */
export function fontsHref(fontStack: string | undefined, style: UiStyle | undefined): string | null {
  return googleFontsHref([fontStack ? googleFontSpec(fontStack) : null, ...(style?.fonts ?? []).map((k) => UI_FONTS[k]?.g || null)]);
}
