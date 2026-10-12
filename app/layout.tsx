import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';
import { DEFAULT_SETTINGS } from '@/models/Setting';

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

function paletteBlock(selector: string, p: Record<string, string>) {
  return `${selector}{
    --color-primary:${p.primary || '#2563eb'};
    --color-primary-fg:${p.primaryFg || '#ffffff'};
    --color-bg:${p.bg || '#f8fafc'};
    --color-surface:${p.surface || '#ffffff'};
    --color-border:${p.border || '#e2e8f0'};
    --color-muted:${p.muted || '#64748b'};
    --color-text:${p.text || '#0f172a'};
    --color-success:${p.success || '#16a34a'};
    --color-warning:${p.warning || '#d97706'};
    --color-danger:${p.danger || '#dc2626'};
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

  const css = [
    paletteBlock(':root', s.light),
    paletteBlock('.dark', s.dark),
    `:root, .dark {
      --radius-md:${s.radiusMd || '8px'};
      --radius-lg:${s.radiusLg || '12px'};
      --font-sans:${s.font || 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'};
    }`,
  ].join('\n');

  return (
    <html lang="en" data-theme-mode={s.themeMode || 'system'} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {THEME_SCRIPT && <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}