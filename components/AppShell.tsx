// =============================================================================
// FILE: components/AppShell.tsx
// Signed-in app frame:
//   desktop — sticky sidebar (collapsible rail, remembered) + glassy top bar
//   phones  — top bar + bottom tab bar + slide-in drawer
//   anywhere — Ctrl/⌘ K command palette, reading-progress bar (some styles),
//   announcement banner, maintenance bar and the two-step sign-in reminder.
// Used by app/(app)/layout.tsx.
// =============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';
import CommandPalette, { openCommandPalette } from './CommandPalette';
import NavIcon from './NavIcon';
import { pageTitle, type Features } from '@/lib/nav';
import type { Role } from '@/lib/constants';

export type { Features };

type Props = {
  user: { name?: string | null; email?: string | null; role: Role; royal?: boolean; avatar?: string };
  orgName: string;
  logo: string;
  features?: Partial<Features>;
  announcement?: { text: string; tone: 'info' | 'success' | 'warning' | 'danger'; link: string } | null;
  /** Admin-only warning bar while maintenance mode is on. */
  maintenance?: boolean;
  /** Settings require two-step sign-in for this user and it is not set up yet. */
  needs2fa?: boolean;
  children: React.ReactNode;
};

const BANNER: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: 'bg-hero text-text border-border',
  success: 'bg-success/12 text-success border-success/30',
  warning: 'bg-warning/15 text-text border-warning/40',
  danger: 'bg-danger/12 text-danger border-danger/30',
};

function Announcement({ a }: { a: NonNullable<Props['announcement']> }) {
  const [hidden, setHidden] = useState(false);
  const key = `ann:${a.text.length}:${a.text.slice(0, 40)}`;
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key) === '1') setHidden(true);
    } catch {
      /* storage blocked */
    }
  }, [key]);
  if (hidden) return null;
  const internal = a.link.startsWith('/');
  return (
    <div role="status" className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-sm ${BANNER[a.tone]}`}>
      <span aria-hidden>📣</span>
      <p className="flex-1 min-w-0 whitespace-pre-line">
        {a.text}
        {a.link && (
          <>
            {' '}
            {internal ? (
              <Link href={a.link} className="font-semibold underline underline-offset-2">Open</Link>
            ) : (
              <a href={a.link} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Open</a>
            )}
          </>
        )}
      </p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        className="shrink-0 opacity-70 hover:opacity-100"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(key, '1');
          } catch {
            /* ignore */
          }
        }}
      >
        <NavIcon name="close" size={16} />
      </button>
    </div>
  );
}

const RAIL_KEY = 'lms-sidebar-rail';

export default function AppShell({ user, orgName, logo, features, announcement, maintenance, needs2fa, children }: Props) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { title, crumb } = pageTitle(pathname);

  // Remember the desktop rail choice (per browser).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(RAIL_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);

  function toggleSidebar() {
    if (window.matchMedia('(min-width: 768px)').matches) toggleCollapsed();
    else setMobileOpen((v) => !v);
  }

  // Close the drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname]);

  // Mobile drawer: close on Escape, lock page scroll while open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => mq.matches && setMobileOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const royal = user.role === 'admin' && user.royal === true;

  return (
    <div className="min-h-dvh flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[90] focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:rounded-[var(--radius-md)] focus:bg-primary focus:text-primary-fg"
      >
        Skip to content
      </a>
      <div className="ui-progress" aria-hidden />

      <Sidebar
        role={user.role}
        royal={royal}
        features={features}
        orgName={orgName}
        logo={logo}
        userName={user.name ?? ''}
        avatar={user.avatar}
        open={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ---------------- Top bar ---------------- */}
        <header className="ui-topbar sticky top-0 z-30 h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 border-b border-border">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen || !collapsed}
            className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-hero transition-colors"
          >
            <NavIcon name="menu" size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden sm:block text-[11px] uppercase tracking-[0.14em] text-muted truncate">{orgName}</p>
            <p className="text-base sm:text-lg font-semibold leading-tight truncate">
              {title}
              {crumb && <span className="font-normal text-muted"> / {crumb}</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden lg:flex items-center gap-2.5 h-10 w-64 px-3 rounded-[var(--radius-md)] border border-border bg-bg/60 text-sm text-muted hover:text-text hover:bg-hero transition-colors"
          >
            <NavIcon name="search" size={16} />
            <span className="flex-1 text-left">Search or jump to…</span>
            <span className="kbd">Ctrl K</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label="Search"
              className="lg:hidden grid place-items-center w-10 h-10 rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-hero transition-colors"
            >
              <NavIcon name="search" size={19} />
            </button>
            <NotificationBell />
            <span aria-hidden className="hidden sm:block w-px h-8 bg-border mx-1" />
            <UserMenu name={user.name ?? ''} email={user.email ?? ''} role={user.role} royal={royal} avatar={user.avatar} />
          </div>
        </header>

        {/* ---------------- Page ---------------- */}
        <main id="main" className="flex-1 w-full px-4 pt-5 pb-28 sm:px-6 sm:pt-6 md:pb-10 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl">
            {needs2fa && (
              <div role="alert" className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning/12 text-sm">
                <span aria-hidden className="text-lg">🔐</span>
                <p className="flex-1">
                  <b>Two-step sign-in is required for your account.</b> Set it up now to keep using the LMS — it takes about a minute.
                </p>
                <Link href="/profile?tab=security&required=1" className="btn-primary h-9 px-4 text-sm shrink-0">
                  Set up now
                </Link>
              </div>
            )}
            {maintenance && (
              <div role="status" className="mb-5 px-4 py-3 rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 text-danger text-sm">
                <b>Maintenance mode is ON.</b> Students and mentors can&apos;t use the LMS right now. Turn it off in Settings → Sign-in &amp; maintenance.
              </div>
            )}
            {announcement && <Announcement a={announcement} />}
            <div className="ui-enter" key={pathname}>
              {children}
            </div>
          </div>
        </main>
      </div>

      <MobileNav role={user.role} features={features} onMenu={() => setMobileOpen(true)} />
      <CommandPalette role={user.role} royal={royal} features={features} />
    </div>
  );
}
