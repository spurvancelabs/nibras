'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/theme-script';

type Mode = 'light' | 'dark' | 'system';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function applyMode(mode: Mode) {
  const isDark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

function readCookie(): Mode | null {
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]+)`)
  );
  const v = m ? decodeURIComponent(m[1]) : null;
  return v === 'light' || v === 'dark' || v === 'system' ? v : null;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system');

  useEffect(() => {
    const stored = readCookie();
    if (stored) setMode(stored);
  }, []);

  // If user chose "system", keep in sync with OS changes.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyMode('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  function choose(next: Mode) {
    setMode(next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
    applyMode(next);
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center border border-border rounded-md overflow-hidden"
    >
      <Btn active={mode === 'light'} onClick={() => choose('light')} label="Light">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </Btn>

      <Btn active={mode === 'dark'} onClick={() => choose('dark')} label="Dark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </Btn>

      <Btn active={mode === 'system'} onClick={() => choose('system')} label="System">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`p-1.5 transition ${
        active
          ? 'bg-primary text-primary-fg'
          : 'bg-surface text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}