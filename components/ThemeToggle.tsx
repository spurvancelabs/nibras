// =============================================================================
// FILE: components/ThemeToggle.tsx
// Light / System / Dark segmented switch. Saves choice in the `lms-theme` cookie.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/theme-script';

type ThemeMode = 'light' | 'dark' | 'system';

const OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'light',
    label: 'Light theme',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    mode: 'system',
    label: 'System theme',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    mode: 'dark',
    label: 'Dark theme',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Current theme: user cookie, otherwise the org default set on <html data-theme-mode>
    const cookies = document.cookie.split(';');
    const themeCookie = cookies.find(c => c.trim().startsWith(`${THEME_COOKIE}=`));
    if (themeCookie) {
      const value = decodeURIComponent(themeCookie.split('=')[1]) as ThemeMode;
      setTheme(value);
    } else {
      const orgMode = document.documentElement.dataset.themeMode as ThemeMode | undefined;
      if (orgMode) setTheme(orgMode);
    }
  }, []);

  const updateTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);

    // Set cookie
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(newTheme)}; path=/; max-age=31536000`;

    // Update DOM immediately
    const isDark = newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    // Same size as the real control to prevent layout shift
    return <div className="w-[104px] h-10" aria-hidden />;
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 h-10 p-1 rounded-[var(--radius-md)] border border-border bg-bg"
    >
      {OPTIONS.map((o) => {
        const active = theme === o.mode;
        return (
          <button
            key={o.mode}
            type="button"
            onClick={() => updateTheme(o.mode)}
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
            className={`grid place-items-center w-8 h-8 rounded-[calc(var(--radius-md)-2px)] transition-colors ${
              active
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}