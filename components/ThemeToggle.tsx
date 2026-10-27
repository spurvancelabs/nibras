// =============================================================================
// FILE: components/ThemeToggle.tsx
// Light / System / Dark segmented switch. Saves choice in the `lms-theme`
// cookie. `applyThemeMode()` is shared with the command palette & user menu.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/theme-script';
import NavIcon from './NavIcon';
import { smoothThemeChange } from '@/lib/theme-shift';

export type ThemeMode = 'light' | 'dark' | 'system';

const OPTIONS: { mode: ThemeMode; label: string; icon: 'sun' | 'monitor' | 'moon' }[] = [
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'system', label: 'System', icon: 'monitor' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
];

export function readThemeMode(): ThemeMode {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]) as ThemeMode;
  } catch {
    /* ignore */
  }
  return (document.documentElement.dataset.themeMode as ThemeMode | undefined) ?? 'system';
}

export function applyThemeMode(mode: ThemeMode) {
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(mode)}; path=/; max-age=31536000; samesite=lax`;
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  smoothThemeChange(() => document.documentElement.classList.toggle('dark', isDark));
  window.dispatchEvent(new CustomEvent('lms-theme-mode', { detail: mode }));
}

export default function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readThemeMode());
    const onChange = (e: Event) => setTheme((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener('lms-theme-mode', onChange);
    return () => window.removeEventListener('lms-theme-mode', onChange);
  }, []);

  const h = size === 'sm' ? 'h-9' : 'h-10';
  const btn = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  if (!mounted) return <div className={`w-[104px] ${h}`} aria-hidden />;

  return (
    <div role="group" aria-label="Colour mode" className={`inline-flex items-center gap-0.5 ${h} p-1 rounded-[var(--radius-md)] border border-border bg-bg/60`}>
      {OPTIONS.map((o) => {
        const active = theme === o.mode;
        return (
          <button
            key={o.mode}
            type="button"
            onClick={() => {
              setTheme(o.mode);
              applyThemeMode(o.mode);
            }}
            title={`${o.label} mode`}
            aria-label={`${o.label} mode`}
            aria-pressed={active}
            className={`grid place-items-center ${btn} rounded-[calc(var(--radius-md)-3px)] transition-colors ${
              active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
            }`}
          >
            <NavIcon name={o.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
