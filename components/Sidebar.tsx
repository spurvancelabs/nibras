// =============================================================================
// FILE: components/Sidebar.tsx
// App sidebar. Desktop: sticky full-height, collapses to an icon rail (the
// choice is remembered). Mobile: slide-in drawer with backdrop.
// Items come from lib/nav.ts (roles, royal-only, feature switches).
// =============================================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Avatar from './Avatar';
import NavIcon from './NavIcon';
import { visibleNav, isActivePath, type Features, type NavItem } from '@/lib/nav';
import { openCommandPalette } from './CommandPalette';
import type { Role } from '@/lib/constants';

type Props = {
  role: Role;
  royal?: boolean;
  features?: Partial<Features>;
  orgName: string;
  logo: string;
  userName?: string;
  avatar?: string;
  open: boolean; // mobile drawer
  collapsed: boolean; // desktop rail
  onClose: () => void;
  onToggleCollapsed: () => void;
};

export default function Sidebar({
  role,
  royal = false,
  features,
  orgName,
  logo,
  userName = '',
  avatar = '',
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
}: Props) {
  const pathname = usePathname() ?? '';
  const items = visibleNav(role, royal, features).filter((n) => n.group !== 'account');
  const learn = items.filter((n) => n.group === 'learn');
  const manage = items.filter((n) => n.group === 'manage');
  const rail = collapsed ? 'md:hidden' : '';

  function renderLink(item: NavItem) {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
          collapsed ? 'md:justify-center md:px-0' : ''
        } ${active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'}`}
      >
        <NavIcon name={item.icon} className="shrink-0" />
        <span className={`truncate ${rail}`}>{item.label}</span>
        {collapsed && (
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full ml-3 hidden md:group-hover:block whitespace-nowrap rounded-[var(--radius-md)] bg-text text-bg text-xs font-medium px-2.5 py-1.5 shadow-lg z-50"
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  }

  const heading = (label: string) => (
    <p className={`px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80 ${collapsed ? 'md:sr-only' : ''}`}>{label}</p>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        aria-label="Main navigation"
        className={`ui-sidebar fixed z-50 inset-y-0 left-0 w-[17rem] max-w-[86vw] flex flex-col border-r border-border shadow-2xl md:shadow-none
          transition-[transform,width] duration-200 ease-out
          md:sticky md:top-0 md:z-20 md:h-dvh md:max-w-none md:translate-x-0 md:shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-[76px]' : 'md:w-64'}`}
      >
        {/* Brand — same height as the top bar */}
        <div className={`h-16 flex items-center gap-2.5 px-4 border-b border-border shrink-0 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5 min-w-0" aria-label={`${orgName} home`}>
            {logo ? (
              <Image
                src={logo}
                alt={orgName}
                width={320}
                height={80}
                className={`brand-logo ${collapsed ? 'md:h-7 md:max-w-[44px]' : 'md:max-w-[190px]'}`}
              />
            ) : (
              <>
                <span aria-hidden className="flex items-center shrink-0">
                  <span className="w-5 h-5 rounded-full bg-primary" />
                  <span className="w-5 h-5 -ml-1.5 rounded-full border-2 border-primary bg-hero" />
                </span>
                <span className={`font-semibold truncate ${rail}`}>{orgName}</span>
              </>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-hero md:hidden"
          >
            <NavIcon name="close" />
          </button>
        </div>

        {/* Search */}
        <div className={`px-3 pt-3 ${collapsed ? 'md:px-2' : ''}`}>
          <button
            type="button"
            onClick={() => {
              onClose();
              openCommandPalette();
            }}
            title="Search (Ctrl K)"
            className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-[var(--radius-md)] border border-border bg-bg/60 text-sm text-muted hover:text-text hover:bg-hero transition-colors ${
              collapsed ? 'md:justify-center md:px-0' : ''
            }`}
          >
            <NavIcon name="search" size={17} className="shrink-0" />
            <span className={`flex-1 text-left ${rail}`}>Search…</span>
            <span className={`kbd ${rail}`}>Ctrl K</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-6">
          <div className="space-y-1">
            {heading('Menu')}
            {learn.map(renderLink)}
          </div>
          {manage.length > 0 && (
            <div className="space-y-1">
              {heading('Admin')}
              {collapsed && <span aria-hidden className="hidden md:block mx-3 mb-2 h-px bg-border" />}
              {manage.map(renderLink)}
            </div>
          )}
        </nav>

        {/* Footer: profile + collapse */}
        <div className="shrink-0 border-t border-border p-3 space-y-2">
          <Link
            href="/profile"
            onClick={onClose}
            title={collapsed ? 'Profile' : undefined}
            aria-current={pathname === '/profile' ? 'page' : undefined}
            className={`flex items-center gap-3 p-2 rounded-[var(--radius-md)] transition-colors ${collapsed ? 'md:justify-center' : ''} ${
              pathname === '/profile' ? 'bg-hero' : 'hover:bg-hero'
            }`}
          >
            <Avatar name={userName || 'User'} src={avatar} size={36} />
            <span className={`min-w-0 leading-tight ${rail}`}>
              <span className="block text-sm font-medium text-text truncate">{userName || 'Profile'}</span>
              <span className="block text-[11px] text-muted capitalize">
                {role}
                {royal ? ' · royal' : ''}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden md:flex w-full items-center gap-3 h-9 px-3 rounded-[var(--radius-md)] text-xs font-medium text-muted hover:text-text hover:bg-hero transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <NavIcon name="collapse" size={17} className={`shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            <span className={rail}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
