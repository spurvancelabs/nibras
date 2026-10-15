// =============================================================================
// FILE: components/AppShell.tsx
// Logged-in app frame: sticky sidebar + sticky top navbar + page content.
// Used by app/(app)/layout.tsx. Desktop toggle = collapse sidebar to icon rail,
// mobile toggle = slide-in drawer.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import type { Role } from '@/lib/constants';

type Props = {
  user: { name?: string | null; role: Role };
  orgName: string;
  logo: string;
  children: React.ReactNode;
};

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  assignments: 'Assignments',
  queries: 'Queries',
  attendance: 'Attendance',
  programs: 'Programs',
  users: 'Users',
  settings: 'Settings',
  profile: 'Profile',
  notifications: 'Notifications',
};

const SUB_TITLES: Record<string, string> = {
  new: 'New',
  import: 'Import',
  attendance: 'Attendance',
  materials: 'Materials',
};

/** "/admin/users/new" -> { title: "Users", crumb: "New" } */
function pageTitle(pathname: string) {
  const seg = pathname.split('/').filter(Boolean).filter((s) => s !== 'admin');
  const title = TITLES[seg[0] ?? ''] ?? 'Dashboard';
  const last = seg[seg.length - 1];
  let crumb = '';
  if (seg.length > 1 && last) crumb = SUB_TITLES[last] ?? 'Details';
  return { title, crumb };
}

export default function AppShell({ user, orgName, logo, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopVisible, setDesktopVisible] = useState(true);
  const { title, crumb } = pageTitle(pathname ?? '');

  function toggleSidebar() {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setDesktopVisible((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }

  // Mobile drawer: close on Escape, lock page scroll while open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  // Close the drawer if the screen grows to desktop size
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => mq.matches && setMobileOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        role={user.role}
        orgName={orgName}
        logo={logo}
        userName={user.name ?? ''}
        open={mobileOpen}
        desktopVisible={desktopVisible}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ---------------- Sticky top navbar ---------------- */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-surface/85 backdrop-blur-md">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={mobileOpen || desktopVisible}
            className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] border border-border bg-surface text-text hover:bg-hero transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden sm:block text-[11px] uppercase tracking-[0.14em] text-muted truncate">
              {orgName}
            </p>
            <p className="text-base sm:text-lg font-semibold leading-tight truncate">
              {title}
              {crumb && <span className="font-normal text-muted"> / {crumb}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <span aria-hidden className="hidden lg:block w-px h-8 bg-border" />
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-full p-0.5 lg:pr-3 hover:bg-hero transition"
              aria-label="Your profile"
            >
              <Avatar name={user.name || 'User'} size={36} />
              <span className="hidden lg:block leading-tight text-left">
                <span className="block text-sm font-medium truncate max-w-[10rem]">
                  {user.name}
                </span>
                <span className="block text-[11px] text-muted capitalize">{user.role}</span>
              </span>
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* ---------------- Page ---------------- */}
        <main className="flex-1 w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}