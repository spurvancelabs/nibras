'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/constants';

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: React.ReactNode;
};

const Icon = {
  dash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  sessions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  assignments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
  queries: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  attendance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  programs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7l10-5 10 5-10 5L2 7z" />
      <path d="M6 9v6c0 1.5 2.7 3 6 3s6-1.5 6-3V9" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
  open: boolean;              // mobile drawer
  desktopVisible: boolean;    // desktop sidebar
  onClose: () => void;
};

export default function Sidebar({
  role,
  orgName,
  logo,
  open,
  desktopVisible,
  onClose,
}: Props) {
    const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed z-50 inset-y-0 left-0 w-60 flex flex-col
          bg-surface border-r border-border
          transition-transform duration-200
          md:static md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${desktopVisible ? '' : 'md:hidden'}
        `}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border shrink-0">
          {logo ? (
            <Image
              src={logo}
              alt={orgName}
              width={120}
              height={28}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <span className="font-semibold truncate">{orgName}</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? 'bg-primary text-primary-fg'
                    : 'text-text hover:bg-bg'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <Link
            href="/profile"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
              pathname === '/profile'
                ? 'bg-primary text-primary-fg'
                : 'text-text hover:bg-bg'
            }`}
          >
            <span className="shrink-0">{Icon.user}</span>
            <span className="truncate">Profile</span>
          </Link>
          <p className="text-xs text-muted px-3">v0.1 · {role}</p>
        </div>
      </aside>
    </>
  );
}