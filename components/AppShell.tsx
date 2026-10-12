'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';
import type { Role } from '@/models/User';

type Props = {
  user: { name?: string | null; role: Role };
  orgName: string;
  logo: string;
  children: React.ReactNode;
};

export default function AppShell({ user, orgName, logo, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        role={user.role}
        orgName={orgName}
        logo={logo}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-outline md:hidden p-2"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:inline">
              {user.name}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}