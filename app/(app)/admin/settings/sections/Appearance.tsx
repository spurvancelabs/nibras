// =============================================================================
// FILE: app/(app)/admin/settings/sections/Appearance.tsx   (NEW FILE)
// Settings → Appearance studio:
//   preview (light + dark), 550 colour themes, 150+ design styles, default
//   mode, personalisation, Deluxe/Anime scene + artwork, fine-tuning (fonts,
//   corners, every colour with contrast checks).
// Every change previews live on the whole page; Save publishes it.
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import ThemePresetPicker from '@/components/ThemePresetPicker';
import UiStylePicker from '@/components/UiStylePicker';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import { AppMock } from '@/components/appearance/preview';
import { SettingsCard, Field, Toggle, Segmented, RangeField, Pill } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import { FONT_OPTIONS, findPreset, type ThemePalette, type ThemePreset, type ThemeMode } from '@/lib/theme-config';
import { findUiStyle, type UiStyle } from '@/lib/ui-styles';
import { contrast } from '@/lib/theme-presets';
import { SCENE_LABELS } from '@/lib/theme-scenes';
import type { AppearanceProps } from './types';

const PALETTE_FIELDS: { key: keyof ThemePalette; label: string; hint?: string }[] = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, active menu' },
  { key: 'primaryFg', label: 'Text on primary' },
  { key: 'primary2', label: 'Gradient end', hint: 'Used by gradient styles' },
  { key: 'bg', label: 'Page background' },
  { key: 'surface', label: 'Cards' },
  { key: 'heroBg', label: 'Highlight band' },
  { key: 'accent', label: 'Decor accent' },
  { key: 'border', label: 'Borders' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Secondary text' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
];

const px = (v: string, d: number) => {
  const m = /^(\d+(?:\.\d+)?)px$/.exec((v ?? '').trim());
  return m ? Number(m[1]) : d;
};

function ContrastBadge({ a, b, min, label }: { a: string; b: string; min: number; label: string }) {
  let c = 0;
  try {
    c = contrast(a, b);
  } catch {
    c = 0;
  }
  const ok = c >= min;
  return (
    <Pill tone={ok ? 'success' : 'danger'}>
      {ok ? '✓' : '!'} {label} {c ? c.toFixed(1) : '?'}:1
    </Pill>
  );
}

export function AppearanceSection({ form, set, setForm, onHoverPreset, onHoverStyle }: AppearanceProps) {
  const [applyStyleWithTheme, setApplyStyleWithTheme] = useState(true);
  const [paletteMode, setPaletteMode] = useState<'light' | 'dark'>('light');
  const preset = findPreset(form.themePresetId);
  const style = findUiStyle(form.uiStyle);

  function applyPreset(p: ThemePreset | null) {
    if (!p) return;
    setForm((f) => ({
      ...f,
      light: { ...p.light },
      dark: { ...p.dark },
      font: p.font,
      radiusMd: p.radiusMd,
      radiusLg: p.radiusLg,
      themePresetId: p.id,
      ...(applyStyleWithTheme && p.uiStyle && findUiStyle(p.uiStyle) ? { uiStyle: p.uiStyle } : {}),
    }));
  }

  function applyStyle(s: UiStyle | null) {
    if (s) set('uiStyle', s.id);
  }

  const fontIsPreset = FONT_OPTIONS.some((f) => f.value === form.font);
  const pal = form[paletteMode];
  const darkSuggestion = style?.mode === 'dark' && form.themeMode !== 'dark';

  const mockStyle = style;
  const scene = form.showScene ? preset?.scene : undefined;
  const mocks = useMemo(
    () => (
      <div className="grid sm:grid-cols-2 gap-3">
        <AppMock palette={form.light} style={mockStyle} radiusMd={form.radiusMd} radiusLg={form.radiusLg} font={form.font} scene={scene} label="Light mode" orgName={form.orgName} />
        <AppMock palette={form.dark} style={mockStyle} dark radiusMd={form.radiusMd} radiusLg={form.radiusLg} font={form.font} scene={scene} label="Dark mode" orgName={form.orgName} />
      </div>
    ),
    [form.light, form.dark, mockStyle, form.radiusMd, form.radiusLg, form.font, scene, form.orgName]
  );

  return (
    <>
      {/* ---------------- Preview ---------------- */}
      <SettingsCard
        title="Live preview"
        description="Everything you change here previews instantly on this whole page. Nothing is published until you press Save."
        icon={<NavIcon name="sparkle" />}
      >
        {mocks}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Pill tone="primary">🎨 {preset?.name ?? 'Custom colours'}</Pill>
          <Pill tone="primary">✨ {style?.name ?? 'Classic'}</Pill>
          {preset?.scene && <Pill>🌸 {SCENE_LABELS[preset.scene]}</Pill>}
        </div>
      </SettingsCard>

      {/* ---------------- Colour theme ---------------- */}
      <SettingsCard
        title="Colour theme"
        description="550 hand-tuned themes. Every one is checked for readable contrast in light AND dark mode. Hover to preview, click to choose."
        icon={<NavIcon name="palette" />}
      >
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={applyStyleWithTheme} onChange={(e) => setApplyStyleWithTheme(e.target.checked)} />
          Also switch to the theme&apos;s matching design style (Deluxe &amp; Anime themes)
        </label>
        <ThemePresetPicker value={form.themePresetId || null} onSelect={applyPreset} onPreview={onHoverPreset} />
      </SettingsCard>

      {/* ---------------- Design style ---------------- */}
      <SettingsCard
        title="Design style"
        description="The shape and feel of every card, button and input — Glassmorphism, Neumorphism, Neobrutalism, Windows 95, Cyberpunk HUD and 150+ more. Works with every colour theme."
        icon={<NavIcon name="dash" />}
      >
        {darkSuggestion && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 text-sm">
            <span className="flex-1">
              <b>{style?.name}</b> looks best in dark mode.
            </span>
            <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={() => set('themeMode', 'dark')}>
              Make dark the default
            </button>
          </div>
        )}
        <UiStylePicker value={form.uiStyle || 'classic'} onSelect={applyStyle} onPreview={onHoverStyle} />
      </SettingsCard>

      {/* ---------------- Mode & personalisation ---------------- */}
      <SettingsCard title="Mode & personalisation" description="The default for new visitors. Everyone can still switch light/dark from their menu." icon={<NavIcon name="moon" />}>
        <Field label="Default mode">
          <Segmented<ThemeMode>
            value={form.themeMode}
            onChange={(v) => set('themeMode', v)}
            ariaLabel="Default mode"
            options={[
              { value: 'light', label: 'Light', icon: <NavIcon name="sun" size={15} /> },
              { value: 'dark', label: 'Dark', icon: <NavIcon name="moon" size={15} /> },
              { value: 'system', label: 'Follow device', icon: <NavIcon name="monitor" size={15} /> },
            ]}
          />
        </Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Toggle
            checked={form.allowUserThemes}
            onChange={(v) => set('allowUserThemes', v)}
            label="Personal colour themes"
            description="Each person can pick their own colours in Profile → Appearance."
            icon="🎨"
          />
          <Toggle
            checked={form.allowUserStyles}
            onChange={(v) => set('allowUserStyles', v)}
            label="Personal design styles"
            description="Each person can pick their own design style."
            icon="✨"
          />
        </div>
      </SettingsCard>

      {/* ---------------- Scene & artwork ---------------- */}
      <SettingsCard
        title="Scene & artwork"
        description="Deluxe and Anime Deluxe themes come with an illustrated background. You can also add your own artwork to the dashboard and sign-in page."
        icon={<span aria-hidden>🌸</span>}
      >
        <Toggle
          checked={form.showScene}
          onChange={(v) => set('showScene', v)}
          label="Show illustrated backgrounds"
          description={
            preset?.scene
              ? `Current theme: ${SCENE_LABELS[preset.scene]}.`
              : 'The current theme has no scene — pick one from the Deluxe or Anime Deluxe categories.'
          }
          icon="🖼️"
        />
        <Field
          label="Your artwork (optional)"
          hint="Shown on the dashboard welcome card and the sign-in page. Use art you own or are licensed to use — for example commissioned or open-licence anime art. A transparent PNG or WebP works best."
        >
          <CloudinaryUpload value={form.heroArt} onChange={(url) => set('heroArt', url)} label="Upload artwork" accept="image/png,image/webp,image/jpeg" />
        </Field>
      </SettingsCard>

      {/* ---------------- Fine-tune ---------------- */}
      <SettingsCard title="Fine-tune" description="Optional. Adjust the font, corner roundness and individual colours." icon={<NavIcon name="settings" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Font" htmlFor="font">
            <select id="font" className="input h-11" value={form.font} onChange={(e) => set('font', e.target.value)}>
              {!fontIsPreset && <option value={form.font}>Custom</option>}
              {FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="p-3 rounded-[var(--radius-md)] border border-border bg-bg/60" style={{ fontFamily: form.font }}>
            <p className="text-lg font-semibold">The quick brown fox</p>
            <p className="text-sm text-muted">jumps over the lazy dog — 0123456789</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <RangeField label="Small corners (buttons, inputs)" value={px(form.radiusMd, 8)} min={0} max={24} unit="px" onChange={(v) => set('radiusMd', `${v}px`)} />
          <RangeField label="Large corners (cards)" value={px(form.radiusLg, 16)} min={0} max={40} unit="px" onChange={(v) => set('radiusLg', `${v}px`)} />
        </div>

        <details className="group rounded-[var(--radius-md)] border border-border">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none text-sm font-medium">
            Edit individual colours
            <NavIcon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented<'light' | 'dark'>
                value={paletteMode}
                onChange={setPaletteMode}
                options={[
                  { value: 'light', label: 'Light colours' },
                  { value: 'dark', label: 'Dark colours' },
                ]}
              />
              <div className="flex flex-wrap gap-1.5">
                <ContrastBadge a={pal.primary} b={pal.primaryFg} min={4.5} label="Button" />
                <ContrastBadge a={pal.text} b={pal.bg} min={7} label="Text" />
                <ContrastBadge a={pal.muted} b={pal.bg} min={4.5} label="Muted" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {PALETTE_FIELDS.map((f) => {
                const v = (pal[f.key] as string | undefined) ?? '';
                return (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label={`${f.label} colour`}
                        value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'}
                        onChange={(e) => setForm((fm) => ({ ...fm, [paletteMode]: { ...fm[paletteMode], [f.key]: e.target.value } }))}
                        className="h-10 w-12 shrink-0 rounded-[var(--radius-md)] border border-border bg-surface cursor-pointer p-1"
                      />
                      <input
                        className="input h-10 font-mono text-sm"
                        value={v}
                        placeholder={f.key === 'primary2' ? 'same as primary' : ''}
                        onChange={(e) => setForm((fm) => ({ ...fm, [paletteMode]: { ...fm[paletteMode], [f.key]: e.target.value } }))}
                      />
                    </div>
                  </Field>
                );
              })}
            </div>
            {preset && (
              <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={() => applyPreset(preset)}>
                Reset colours to “{preset.name}”
              </button>
            )}
          </div>
        </details>
      </SettingsCard>
    </>
  );
}
