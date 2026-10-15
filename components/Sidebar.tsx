// =============================================================================
// FILE: components/Sidebar.tsx
// App sidebar. Desktop: sticky full-height, collapses to an icon rail.
// Mobile: slide-in drawer with backdrop. Nav items filtered by role.
// =============================================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import type { Role } from '@/lib/constants';

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: React.ReactNode;
};

const svg = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Icon = {
  dash: (
    <svg {...svg}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  sessions: (
    <svg {...svg}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  assignments: (
    <svg {...svg}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
  queries: (
    <svg {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  attendance: (
    <svg {...svg}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  users: (
    <svg {...svg}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  programs: (
    <svg {...svg}>
      <path d="M2 7l10-5 10 5-10 5L2 7z" />
      <path d="M6 9v6c0 1.5 2.7 3 6 3s6-1.5 6-3V9" />
    </svg>
  ),
  settings: (
    <svg {...svg}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  close: (
    <svg {...svg} strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'mentor', 'student'], icon: Icon.dash },
  { href: '/sessions', label: 'Sessions', roles: ['admin', 'mentor', 'student'], icon: Icon.sessions },
  { href: '/assignments', label: 'Assignments', roles: ['admin', 'mentor', 'student'], icon: Icon.assignments },
  { href: '/queries', label: 'Queries', roles: ['admin', 'mentor', 'student'], icon: Icon.queries },
  { href: '/attendance', label: 'Attendance', roles: ['student'], icon: Icon.attendance },
  { href: '/admin/programs', label: 'Programs', roles: ['admin'], icon: Icon.programs },
  { href: '/admin/users', label: 'Users', roles: ['admin'], icon: Icon.users },
  { href: '/admin/settings', label: 'Settings', roles: ['admin'], icon: Icon.settings },
];

type Props = {
  role: Role;
  orgName: string;
  logo: string;
  userName?: string;
  open: boolean;              // mobile drawer
  desktopVisible: boolean;    // desktop: full sidebar (true) or icon rail (false)
  onClose: () => void;
};

export default function Sidebar({
  role,
  orgName,
  logo,
  userName = '',
  open,
  desktopVisible,
  onClose,
}: Props) {
  const pathname = usePathname() ?? '';
  const items = NAV.filter((n) => n.roles.includes(role));
  const mainItems = items.filter((n) => !n.href.startsWith('/admin'));
  const adminItems = items.filter((n) => n.href.startsWith('/admin'));
  const collapsed = !desktopVisible; // only affects md+ screens

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // Hide text in rail mode (desktop only); mobile drawer always shows labels
  const labelCls = collapsed ? 'md:hidden' : '';

  // Plain render function (not a nested component) so links don't remount on every render
  function renderLink(item: NavItem) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium transition ${
          collapsed ? 'md:justify-center md:px-0' : ''
        } ${
          active
            ? 'bg-primary text-primary-fg shadow-sm'
            : 'text-muted hover:text-text hover:bg-hero'
        }`}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className={`truncate ${labelCls}`}>{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        aria-label="Main navigation"
        className={`
          fixed z-50 inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col
          bg-surface border-r border-border shadow-2xl md:shadow-none
          transition-[transform,width] duration-200 ease-out
          md:sticky md:top-0 md:z-20 md:h-screen md:max-w-none md:translate-x-0 md:shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-[76px]' : 'md:w-64'}
        `}
      >
        {/* Brand — same height as the top navbar */}
        <div
          className={`h-16 flex items-center gap-2.5 px-5 border-b border-border shrink-0 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          {logo ? (
            <Image
              src={logo}
              alt={orgName}
              width={120}
              height={28}
              className={`h-7 w-auto object-contain ${collapsed ? 'md:h-6 md:max-w-[44px]' : ''}`}
            />
          ) : (
            <>
              <span aria-hidden className="flex items-center shrink-0">
                <span className="w-5 h-5 rounded-full bg-primary" />
                <span className="w-5 h-5 -ml-1.5 rounded-full border-2 border-primary bg-hero" />
              </span>
              <span className={`font-semibold truncate ${labelCls}`}>{orgName}</span>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-hero md:hidden"
          >
            {Icon.close}
          </button>
        </div>

        {/* Navigation (scrolls on its own if long) */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-6">
          <div className="space-y-1">
            <p className={`px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted ${collapsed ? 'md:sr-only' : ''}`}>
              Menu
            </p>
            {mainItems.map((item) => (
              renderLink(item)
            ))}
          </div>

          {adminItems.length > 0 && (
            <div className="space-y-1">
              <p className={`px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted ${collapsed ? 'md:sr-only' : ''}`}>
                Admin
              </p>
              {collapsed && <span aria-hidden className="hidden md:block mx-3 mb-2 h-px bg-border" />}
              {adminItems.map((item) => (
                renderLink(item)
              ))}
            </div>
          )}
        </nav>

        {/* Footer: theme (mobile) + profile */}
        <div className="shrink-0 border-t border-border p-3 space-y-3">
          <div className="sm:hidden flex items-center justify-between px-2">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle />
          </div>

          <Link
            href="/profile"
            onClick={onClose}
            title={collapsed ? 'Profile' : undefined}
            aria-current={pathname === '/profile' ? 'page' : undefined}
            className={`flex items-center gap-3 p-2 rounded-[var(--radius-md)] transition ${
              collapsed ? 'md:justify-center' : ''
            } ${pathname === '/profile' ? 'bg-hero' : 'hover:bg-hero'}`}
          >
            <Avatar name={userName || 'User'} size={36} />
            <span className={`min-w-0 leading-tight ${labelCls}`}>
              <span className="block text-sm font-medium text-text truncate">
                {userName || 'Profile'}
              </span>
              <span className="block text-[11px] text-muted capitalize">
                {role} · v0.1
              </span>
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}