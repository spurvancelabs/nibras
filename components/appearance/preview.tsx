// =============================================================================
// FILE: components/appearance/preview.tsx   (NEW FILE)
// Scoped previews: a mini app mock-up rendered with any palette + design
// style, without touching the rest of the page (CSS variables are set inline
// on the preview box). Also: live whole-page preview helpers.
// =============================================================================

'use client';

import { useEffect } from 'react';
import type { ThemePalette } from '@/lib/theme-config';
import { uiStylePreviewVars, type UiStyle } from '@/lib/ui-styles';
import { sceneBackground, type SceneId } from '@/lib/theme-scenes';

export function paletteStyle(p: ThemePalette): Record<string, string> {
  return {
    '--color-primary': p.primary,
    '--color-primary-fg': p.primaryFg,
    '--color-primary-2': p.primary2 || p.primary,
    '--color-bg': p.bg,
    '--color-surface': p.surface,
    '--color-border': p.border,
    '--color-muted': p.muted,
    '--color-text': p.text,
    '--color-success': p.success,
    '--color-warning': p.warning,
    '--color-danger': p.danger,
    '--color-hero': p.heroBg,
    '--color-accent': p.accent,
  };
}

type MockProps = {
  palette: ThemePalette;
  style?: UiStyle;
  dark?: boolean;
  radiusMd?: string;
  radiusLg?: string;
  font?: string;
  scene?: SceneId;
  label?: string;
  orgName?: string;
  compact?: boolean;
};

/** A small, realistic mock-up of the app in the given appearance. */
export function AppMock({ palette, style, dark = false, radiusMd = '8px', radiusLg = '16px', font, scene, label, orgName = 'Nibras', compact = false }: MockProps) {
  const vars: Record<string, string> = {
    ...paletteStyle(palette),
    '--radius-md-base': radiusMd,
    '--radius-lg-base': radiusLg,
    ...(style ? uiStylePreviewVars(style, dark) : { '--radius-md': radiusMd, '--radius-lg': radiusLg }),
    ...(font ? { '--font-sans': font } : {}),
    colorScheme: dark ? 'dark' : 'light',
  };
  return (
    <div
      className="relative isolate overflow-hidden rounded-[12px] border border-black/10 text-[12px] select-none"
      style={{ ...(vars as React.CSSProperties), background: palette.bg, color: palette.text, fontFamily: 'var(--ui-font-body, var(--font-sans))' }}
      aria-hidden
    >
      {/* backdrop / pattern / scene */}
      <div className="absolute inset-0 -z-10" style={{ background: 'var(--ui-backdrop, none)' }} />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'var(--ui-pattern-color)',
          WebkitMask: 'var(--ui-pattern, none)',
          mask: 'var(--ui-pattern, none)',
          opacity: 'var(--ui-pattern-opacity, 0)' as unknown as number,
        }}
      />
      {scene && <div className="absolute inset-0 -z-10" style={{ background: sceneBackground(scene, palette, dark) }} />}

      <div className="flex">
        {!compact && (
          <div className="ui-sidebar w-[28%] border-r border-border p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 pb-1.5">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-semibold truncate text-[11px]">{orgName}</span>
            </div>
            <div className="h-6 rounded-[var(--radius-md)] bg-primary text-primary-fg px-2 flex items-center text-[10px] font-medium">Dashboard</div>
            {['Sessions', 'Quizzes', 'Settings'].map((x) => (
              <div key={x} className="h-6 px-2 flex items-center text-[10px] text-muted">
                {x}
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0 p-2.5 space-y-2">
          <div className="bg-hero rounded-[var(--radius-lg)] p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-muted">{label ?? (dark ? 'Dark' : 'Light')}</p>
            <h1 className="text-[15px] font-semibold leading-tight" style={{ fontSize: 15 }}>
              Good morning
            </h1>
            <div className="mt-1.5 flex gap-1.5">
              <button type="button" tabIndex={-1} className="btn-primary !px-2.5 !py-1 text-[10px]">
                Join class
              </button>
              <button type="button" tabIndex={-1} className="btn-outline !px-2 !py-1 text-[10px]">
                Later
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-2">
              <p className="text-[9px] text-muted uppercase">Progress</p>
              <p className="text-[14px] font-bold">86%</p>
              <div className="mt-1 h-1.5 rounded-full bg-hero overflow-hidden">
                <span className="block h-full w-4/5 rounded-full bg-primary" />
              </div>
            </div>
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-2">
              <p className="text-[9px] text-muted uppercase">Quiz</p>
              <div className="mt-1 input !py-1 !px-1.5 text-[10px] text-muted">Answer…</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Applies CSS to the whole page while mounted (live preview of unsaved
 * appearance). Injected last, so it wins over the saved org/personal CSS.
 */
export function useLivePreview(css: string | null, fontsHref: string | null) {
  useEffect(() => {
    if (!css) return;
    const el = document.createElement('style');
    el.id = 'appearance-live-preview';
    el.textContent = css;
    document.body.appendChild(el);
    let link: HTMLLinkElement | null = null;
    if (fontsHref) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontsHref;
      document.head.appendChild(link);
    }
    return () => {
      el.remove();
      link?.remove();
    };
  }, [css, fontsHref]);
}
