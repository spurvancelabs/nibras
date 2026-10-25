// =============================================================================
// FILE: components/MobileNav.tsx   (NEW FILE)
// Bottom tab bar on phones (hidden from md up): 4 shortcuts for the user's
// role + "Menu" (opens the full sidebar drawer). Respects the iPhone home bar.
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavIcon from './NavIcon';
import { mobileNav, isActivePath, type Features } from '@/lib/nav';
import type { Role } from '@/lib/constants';

export default function MobileNav({ role, features, onMenu }: { role: Role; features?: Partial<Features>; onMenu: () => void }) {
  const pathname = usePathname() ?? '';
  const items = mobileNav(role, features);
  return (
    <nav
      aria-label="Quick navigation"
      className="ui-topbar md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16">
        {items.map((n) => {
          const active = isActivePath(pathname, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ${active ? 'text-text' : 'text-muted'}`}
              >
                <span className={`grid place-items-center w-11 h-7 rounded-full transition-colors ${active ? 'bg-primary text-primary-fg' : ''}`}>
                  <NavIcon name={n.icon} size={19} />
                </span>
                <span className="truncate max-w-full px-1">{n.label.replace('My programs', 'Programs')}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} className="w-full h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted">
            <span className="grid place-items-center w-11 h-7 rounded-full">
              <NavIcon name="menu" size={19} />
            </span>
            Menu
          </button>
        </li>
      </ul>
    </nav>
  );
}
