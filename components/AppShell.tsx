'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';
import NotificationBell from './NotificationBell';
import type { Role } from '@/lib/constants';

type Props = {
  user: { name?: string | null; role: Role };
  orgName: string;
  logo: string;
  children: React.ReactNode;
};

export default function AppShell({ user, orgName, logo, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopVisible, setDesktopVisible] = useState(true);

  function toggleSidebar() {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setDesktopVisible((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        role={user.role}
        orgName={orgName}
        logo={logo}
        open={mobileOpen}
        desktopVisible={desktopVisible}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="btn-outline p-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:inline">
              {user.name}
            </span>
            <NotificationBell />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}