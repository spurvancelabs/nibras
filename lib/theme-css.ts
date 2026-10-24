// =============================================================================
// FILE: lib/theme-css.ts   (NEW FILE)
// Builds the CSS-variable blocks for a palette (used for personal themes).
// Values are sanitised so they can't break out of the <style> tag.
// =============================================================================

import type { ThemePalette, ThemePreset } from './theme-config';

const css = (v: unknown, fallback: string) =>
  (typeof v === 'string' && v.trim() ? v : fallback).replace(/[<>{};]/g, '');

export function paletteVars(p: ThemePalette): string {
  return [
    `--color-primary:${css(p.primary, '#000')}`,
    `--color-primary-fg:${css(p.primaryFg, '#fff')}`,
    `--color-bg:${css(p.bg, '#fff')}`,
    `--color-surface:${css(p.surface, '#fff')}`,
    `--color-border:${css(p.border, '#ddd')}`,
    `--color-muted:${css(p.muted, '#666')}`,
    `--color-text:${css(p.text, '#111')}`,
    `--color-success:${css(p.success, '#16a34a')}`,
    `--color-warning:${css(p.warning, '#d97706')}`,
    `--color-danger:${css(p.danger, '#dc2626')}`,
    `--color-hero:${css(p.heroBg, '#f5f5f5')}`,
    `--color-accent:${css(p.accent, '#e5e5e5')}`,
  ].join(';');
}

/** CSS that overrides the organisation theme with a preset (light + dark). */
export function presetCss(p: ThemePreset): string {
  return `:root{${paletteVars(p.light)};--radius-md:${css(p.radiusMd, '8px')};--radius-lg:${css(p.radiusLg, '16px')}}.dark{${paletteVars(p.dark)}}`;
}
