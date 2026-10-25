// =============================================================================
// FILE: app/layout.tsx
// Root layout. Reads Settings (MongoDB) and injects the organisation's
// appearance as CSS variables (lib/theme-css.ts):
//   colour theme  --color-* (light on :root, dark on .dark), radius, font,
//                 illustrated scene for Deluxe / Anime themes
//   design style  --ui-* (Glassmorphism, Neobrutalism, … — lib/ui-styles.ts)
//   logo size     --logo-h
// and loads the Google Fonts the theme + style need in ONE stylesheet.
// Signed-in users may override theme/style for themselves (app/(app)/layout).
// =============================================================================

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/providers';
import { DEFAULT_SETTINGS } from '@/models/Setting';
import { clampLogoHeight, type ThemeSettings } from '@/lib/theme-config';
import { orgAppearanceCss, fontsHref } from '@/lib/theme-css';
import { findUiStyle } from '@/lib/ui-styles';

let getSettings: () => Promise<ThemeSettings>;
let THEME_SCRIPT = '';

try {
  const settingsModule = await import('@/lib/settings');
  const themeModule = await import('@/lib/theme-script');
  getSettings = settingsModule.getSettings;
  THEME_SCRIPT = themeModule.THEME_SCRIPT;
} catch (error) {
  console.warn('Settings/Theme modules not fully available, using defaults:', error);
  getSettings = async () => DEFAULT_SETTINGS;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: { default: s.orgName || 'Nibras', template: `%s · ${s.orgName || 'Nibras'}` },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let s: ThemeSettings = DEFAULT_SETTINGS;
  try {
    s = await getSettings();
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
  }

  let appearance = '';
  try {
    appearance = orgAppearanceCss(s);
  } catch (error) {
    // Never let a theme problem take the site down — fall back to defaults.
    console.error('[layout] appearance css failed, using defaults:', error);
    appearance = orgAppearanceCss(DEFAULT_SETTINGS);
  }
  const themeCss = `${appearance}:root{--logo-h:${clampLogoHeight(s.logoHeight ?? DEFAULT_SETTINGS.logoHeight)}px}`;
  const fontHref = fontsHref(s.font || DEFAULT_SETTINGS.font, findUiStyle(s.uiStyle));

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
        <style id="org-appearance" dangerouslySetInnerHTML={{ __html: themeCss }} />
        {THEME_SCRIPT && <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
