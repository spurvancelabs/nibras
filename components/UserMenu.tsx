// =============================================================================
// FILE: components/UserMenu.tsx   (NEW FILE)
// Avatar button in the top bar → menu with profile, appearance, security,
// colour mode and sign out. Closes on outside click and Escape.
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import Avatar from './Avatar';
import NavIcon, { type IconName } from './NavIcon';
import ThemeToggle from './ThemeToggle';

type Props = { name: string; email?: string; role: string; royal?: boolean; avatar?: string };

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/profile', label: 'Profile', icon: 'user' },
  { href: '/profile?tab=appearance', label: 'My appearance', icon: 'palette' },
  { href: '/profile?tab=security', label: 'Security & sign-in', icon: 'shield' },
  { href: '/notifications', label: 'Notifications', icon: 'bell' },
];

export default function UserMenu({ name, email = '', role, royal = false, avatar = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-full p-0.5 lg:pr-3 hover:bg-hero transition-colors"
      >
        <Avatar name={name || 'User'} src={avatar} size={36} />
        <span className="hidden lg:block leading-tight text-left">
          <span className="block text-sm font-medium truncate max-w-[9rem]">{name}</span>
          <span className="block text-[11px] text-muted capitalize">{role}</span>
        </span>
        <NavIcon name="chevron" size={14} className={`hidden lg:block text-muted transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div role="menu" className="ui-popover absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-surface border border-border rounded-[var(--radius-lg)] shadow-2xl z-50 overflow-hidden animate-pop-in">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-hero/40">
            <Avatar name={name || 'User'} src={avatar} size={42} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              {email && <p className="text-xs text-muted truncate">{email}</p>}
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {role}
                {royal && <span title="Royal admin">· 👑 royal</span>}
              </p>
            </div>
          </div>
          <div className="p-1.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm hover:bg-hero transition-colors"
              >
                <NavIcon name={l.icon} size={17} className="text-muted" />
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <span className="text-xs text-muted">Mode</span>
            <ThemeToggle size="sm" />
          </div>
          <div className="p-1.5 border-t border-border">
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <NavIcon name="logout" size={17} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
