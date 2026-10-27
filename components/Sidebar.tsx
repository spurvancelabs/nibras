// =============================================================================
// FILE: components/Sidebar.tsx
// App sidebar. Desktop: sticky full-height, collapses to an icon rail (the
// choice is remembered). Mobile: slide-in drawer with backdrop.
// Items come from lib/nav.ts (roles, permissions, feature switches).
// UPDATED: grouped menu (Overview, Learning, Teaching, Community,
// Administration, Security & policy). Groups can be folded; the choice is
// remembered and the group holding the current page always opens.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Avatar from './Avatar';
import NavIcon from './NavIcon';
import { visibleNav, groupedNav, groupLabel, isActivePath, type Features, type NavItem, type NavGroup } from '@/lib/nav';
import type { PermissionOverrides } from '@/lib/rbac';
import { LEVEL_LABEL, levelOf } from '@/lib/rbac';
import { openCommandPalette } from './palette-events';
import type { Role } from '@/lib/constants';

type Props = {
  role: Role;
  royal?: boolean;
  superAdmin?: boolean;
  premium?: boolean;
  features?: Partial<Features>;
  overrides?: PermissionOverrides | null;
  orgName: string;
  logo: string;
  userName?: string;
  avatar?: string;
  open: boolean; // mobile drawer
  collapsed: boolean; // desktop rail
  onClose: () => void;
  onToggleCollapsed: () => void;
};

const FOLD_KEY = 'lms-nav-folded';

export default function Sidebar({
  role,
  royal = false,
  superAdmin = false,
  premium = false,
  features,
  overrides,
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
  const rbacUser = { role, royal, superAdmin };
  const groups = groupedNav(visibleNav(rbacUser, features, overrides).filter((n) => n.group !== 'account'));
  const rail = collapsed ? 'md:hidden' : '';
  const levelLabel = LEVEL_LABEL[levelOf(rbacUser)];

  // Folded groups (remembered per browser)
  const [folded, setFolded] = useState<NavGroup[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]');
      if (Array.isArray(v)) setFolded(v.filter((x): x is NavGroup => typeof x === 'string'));
    } catch {
      /* ignore */
    }
  }, []);
  function toggleGroup(g: NavGroup) {
    setFolded((f) => {
      const next = f.includes(g) ? f.filter((x) => x !== g) : [...f, g];
      try {
        localStorage.setItem(FOLD_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function renderLink(item: NavItem) {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 h-10 px-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
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
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
          {groups.map(({ group, items }, gi) => {
            const hasActive = items.some((i) => isActivePath(pathname, i.href));
            const isFolded = folded.includes(group) && !hasActive && group !== 'overview';
            const id = `nav-group-${group}`;
            return (
              <div key={group} className="space-y-0.5">
                {group === 'overview' ? null : (
                  <>
                    {collapsed && gi > 0 && <span aria-hidden className="hidden md:block mx-3 my-2 h-px bg-border" />}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      aria-expanded={!isFolded}
                      aria-controls={id}
                      className={`w-full flex items-center gap-2 px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80 hover:text-text transition-colors ${
                        collapsed ? 'md:sr-only' : ''
                      }`}
                    >
                      <span className="flex-1 text-left truncate">{groupLabel(group, role)}</span>
                      <NavIcon
                        name="chevron"
                        size={13}
                        className={`shrink-0 transition-transform duration-200 ${isFolded ? '' : 'rotate-90'}`}
                      />
                    </button>
                  </>
                )}
                <div
                  id={id}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isFolded ? `grid-rows-[0fr] ${collapsed ? 'md:grid-rows-[1fr]' : ''}` : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className={`overflow-hidden space-y-0.5 ${isFolded ? `invisible ${collapsed ? 'md:visible' : ''}` : ''}`}>
                    {items.map(renderLink)}
                  </div>
                </div>
              </div>
            );
          })}
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
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <span className="truncate">{levelLabel}</span>
                {premium && (
                  <span title="Premium member" className="inline-flex items-center gap-0.5 px-1.5 rounded-full bg-warning/15 text-warning font-semibold">
                    <NavIcon name="crown" size={10} /> Premium
                  </span>
                )}
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
