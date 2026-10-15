// =============================================================================
// FILE: components/LogoutButton.tsx
// Sign-out button (icon on phones, icon + text from sm up).
// =============================================================================

'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      aria-label="Logout"
      title="Logout"
      className="inline-flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-3.5 rounded-[var(--radius-md)] border border-border bg-surface text-sm font-medium text-text hover:bg-primary hover:text-primary-fg hover:border-primary transition"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </svg>
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}