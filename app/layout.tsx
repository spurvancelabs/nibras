// =============================================================================
// FILE: app/layout.tsx
// Root layout. Reads Settings (MongoDB) and injects the theme as CSS variables:
//   --color-* (light on :root, dark on .dark), --radius-md/lg, --font-sans
// and loads the selected Google Font (Poppins by default).
// =============================================================================

import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';
import {
  DEFAULT_SETTINGS,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  type ThemePalette,
} from '@/models/Setting';
import { googleFontHref } from '@/lib/theme-config';

let getSettings: () => Promise<any>;
let THEME_SCRIPT = '';

try {
  // Try to import the settings and theme modules
  const settingsModule = await import('@/lib/settings');
  const themeModule = await import('@/lib/theme-script');
  getSettings = settingsModule.getSettings;
  THEME_SCRIPT = themeModule.THEME_SCRIPT;
} catch (error) {
  console.warn('Settings/Theme modules not fully available, using defaults:', error);
  getSettings = async () => DEFAULT_SETTINGS;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: s.orgName || 'Nibras',
      description: `${s.orgName || 'Nibras'} — Learning Management System`,
      icons: s.favicon ? { icon: s.favicon } : undefined,
    };
  } catch (error) {
    console.warn('Failed to load settings for metadata, using defaults:', error);
    return {
      title: 'Nibras',
      description: 'Nibras — Learning Management System',
    };
  }
}

// Values are admin-controlled; strip characters that could break out of the <style> block.
const css = (v: unknown, fallback: string) =>
  (typeof v === 'string' && v.trim() ? v : fallback).replace(/[<>{};]/g, '');

function paletteBlock(
  selector: string,
  p: Partial<ThemePalette> | undefined,
  d: ThemePalette
) {
  const v = p ?? {};
  return `${selector}{
    --color-primary:${css(v.primary, d.primary)};
    --color-primary-fg:${css(v.primaryFg, d.primaryFg)};
    --color-bg:${css(v.bg, d.bg)};
    --color-surface:${css(v.surface, d.surface)};
    --color-border:${css(v.border, d.border)};
    --color-muted:${css(v.muted, d.muted)};
    --color-text:${css(v.text, d.text)};
    --color-success:${css(v.success, d.success)};
    --color-warning:${css(v.warning, d.warning)};
    --color-danger:${css(v.danger, d.danger)};
    --color-hero:${css(v.heroBg, d.heroBg)};
    --color-accent:${css(v.accent, d.accent)};
  }`;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let s = DEFAULT_SETTINGS;

  try {
    s = await getSettings();
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
  }

  const themeCss = [
    paletteBlock(':root', s.light, DEFAULT_LIGHT),
    paletteBlock('.dark', s.dark, DEFAULT_DARK),
    `:root, .dark {
      --radius-md:${css(s.radiusMd, DEFAULT_SETTINGS.radiusMd)};
      --radius-lg:${css(s.radiusLg, DEFAULT_SETTINGS.radiusLg)};
      --font-sans:${css(s.font, DEFAULT_SETTINGS.font)};
    }`,
  ].join('\n');

  const fontHref = googleFontHref(s.font || DEFAULT_SETTINGS.font);

  return (
    <html lang="en" data-theme-mode={s.themeMode || 'light'} suppressHydrationWarning>
      <head>
        {fontHref && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="stylesheet" href={fontHref} />
          </>
        )}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {THEME_SCRIPT && <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}