'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/theme-script';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get current theme from cookie
    const cookies = document.cookie.split(';');
    const themeCookie = cookies.find(c => c.trim().startsWith(`${THEME_COOKIE}=`));
    if (themeCookie) {
      const value = decodeURIComponent(themeCookie.split('=')[1]) as ThemeMode;
      setTheme(value);
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
    return <div className="w-6 h-6" />; // Placeholder to prevent hydration mismatch
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-surface border border-color rounded-lg">
      <button
        onClick={() => updateTheme('light')}
        className={`p-1 rounded transition-colors ${
          theme === 'light' 
            ? 'bg-primary text-primary-fg' 
            : 'hover:bg-primary/10 text-muted'
        }`}
        title="Light theme"
      >
        ☀️
      </button>
      <button
        onClick={() => updateTheme('system')}
        className={`p-1 rounded transition-colors ${
          theme === 'system' 
            ? 'bg-primary text-primary-fg' 
            : 'hover:bg-primary/10 text-muted'
        }`}
        title="System theme"
      >
        💻
      </button>
      <button
        onClick={() => updateTheme('dark')}
        className={`p-1 rounded transition-colors ${
          theme === 'dark' 
            ? 'bg-primary text-primary-fg' 
            : 'hover:bg-primary/10 text-muted'
        }`}
        title="Dark theme"
      >
        🌙
      </button>
    </div>
  );
}