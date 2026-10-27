// =============================================================================
// FILE: components/CommandPalette.tsx   (NEW FILE)
// Ctrl/⌘ K (or "/") opens a quick-jump palette:
//   - pages you can open (same list as the sidebar)
//   - quick actions (new session / assignment / quiz / user, dark mode …)
//   - live search of programs, sessions, assignments, quizzes (and users for
//     admins) — results come from a rate-limited, role-aware server action.
// Keyboard: ↑ ↓ to move, Enter to open, Esc to close.
// =============================================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import NavIcon, { type IconName } from './NavIcon';
import { visibleNav, GROUP_LABEL, type Features } from '@/lib/nav';
import type { PermissionOverrides } from '@/lib/rbac';
import type { Role } from '@/lib/constants';
import { applyThemeMode } from './ThemeToggle';
import { searchAction } from '@/app/(app)/search-actions';
import type { SearchHit } from '@/lib/search';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  group: string;
  keywords?: string;
  run: () => void;
};

const KIND_ICON: Record<SearchHit['kind'], IconName> = {
  program: 'programs',
  session: 'sessions',
  assignment: 'assignments',
  quiz: 'quiz',
  user: 'user',
};

import { OPEN_PALETTE_EVENT, openCommandPalette } from './palette-events';
export { OPEN_PALETTE_EVENT, openCommandPalette };

export default function CommandPalette({
  role,
  royal,
  superAdmin = false,
  features,
  overrides,
  openOnMount = false,
}: {
  openOnMount?: boolean;
  role: Role;
  royal: boolean;
  superAdmin?: boolean;
  features?: Partial<Features>;
  overrides?: PermissionOverrides | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnMount);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, startSearch] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastQ = useRef('');

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setHits([]);
    setActive(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Open with Ctrl/⌘ K, "/" (when not typing), or the custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      lastQ.current = term;
      startSearch(async () => {
        const res = await searchAction(term).catch(() => [] as SearchHit[]);
        if (lastQ.current === term) setHits(res);
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const staticItems = useMemo<Item[]>(() => {
    const pages: Item[] = visibleNav({ role, royal, superAdmin }, features, overrides).map((n) => ({
      id: `page:${n.href}`,
      label: n.label,
      hint: GROUP_LABEL[n.group],
      icon: n.icon as IconName,
      group: 'Go to',
      keywords: n.keywords,
      run: () => go(n.href),
    }));
    const staff = role === 'admin' || role === 'mentor';
    const actions: Item[] = [
      ...(staff
        ? [
            { id: 'new-session', label: 'New session', icon: 'plus' as IconName, group: 'Create', keywords: 'class lecture schedule', run: () => go('/sessions/new') },
            { id: 'new-assignment', label: 'New assignment', icon: 'plus' as IconName, group: 'Create', keywords: 'homework', run: () => go('/assignments/new') },
            ...(features?.quizzes !== false
              ? [{ id: 'new-quiz', label: 'New quiz', icon: 'plus' as IconName, group: 'Create', keywords: 'test exam', run: () => go('/quizzes/new') }]
              : []),
          ]
        : []),
      ...(role === 'admin'
        ? [
            { id: 'new-user', label: 'New user', icon: 'plus' as IconName, group: 'Create', keywords: 'student mentor add', run: () => go('/admin/users/new') },
            { id: 'import-users', label: 'Import users (CSV)', icon: 'users' as IconName, group: 'Create', keywords: 'csv bulk', run: () => go('/admin/users/import') },
            { id: 'appearance', label: 'Change organisation theme & style', icon: 'palette' as IconName, group: 'Appearance', keywords: 'colors design glass brutal', run: () => go('/admin/settings?section=appearance') },
          ]
        : []),
      { id: 'my-appearance', label: 'Change my theme & style', icon: 'palette', group: 'Appearance', keywords: 'personal colors', run: () => go('/profile?tab=appearance') },
      {
        id: 'toggle-dark',
        label: 'Toggle dark mode',
        icon: 'moon',
        group: 'Appearance',
        keywords: 'light theme night',
        run: () => {
          const isDark = document.documentElement.classList.contains('dark');
          applyThemeMode(isDark ? 'light' : 'dark');
          close();
        },
      },
      {
        id: 'system-mode',
        label: 'Use system light/dark',
        icon: 'monitor',
        group: 'Appearance',
        keywords: 'auto',
        run: () => {
          applyThemeMode('system');
          close();
        },
      },
      { id: 'logout', label: 'Sign out', icon: 'logout', group: 'Account', keywords: 'logout exit', run: () => signOut({ callbackUrl: '/login' }) },
    ];
    return [...actions, ...pages];
  }, [role, royal, superAdmin, features, overrides, go, close]);

  const items = useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? staticItems.filter((i) => `${i.label} ${i.keywords ?? ''} ${i.group}`.toLowerCase().includes(term))
      : staticItems;
    const results: Item[] = hits.map((h) => ({
      id: `hit:${h.kind}:${h.id}`,
      label: h.title,
      hint: h.subtitle,
      icon: KIND_ICON[h.kind],
      group: 'Search results',
      run: () => go(h.href),
    }));
    // Search results first when typing, otherwise actions then pages.
    return term ? [...results, ...filtered] : filtered;
  }, [q, staticItems, hits, go]);

  useEffect(() => setActive(0), [q, hits.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[active]?.run();
    }
  }

  if (!open) return null;

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/45 backdrop-blur-[3px] animate-fade-in cursor-default" onClick={close} />
      <div className="ui-popover relative w-full max-w-xl bg-surface border border-border rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-pop-in" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <NavIcon name="search" size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or jump to…"
            aria-label="Search"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pal-${active}` : undefined}
            className="flex-1 min-w-0 h-14 bg-transparent outline-none text-[15px] placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          {searching && <span className="w-4 h-4 rounded-full border-2 border-border border-t-primary animate-spin" aria-hidden />}
          <span className="kbd hidden sm:inline-flex">Esc</span>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2">
          {items.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted">{q.trim().length < 2 ? 'Type to search…' : 'Nothing found.'}</p>
          )}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : '';
            lastGroup = it.group;
            return (
              <div key={it.id}>
                {header && <p className="px-3 pt-3 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{header}</p>}
                <button
                  type="button"
                  id={`pal-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => it.run()}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left text-sm transition-colors ${
                    i === active ? 'bg-hero text-text' : 'text-text'
                  }`}
                >
                  <span className={`grid place-items-center w-8 h-8 rounded-[calc(var(--radius-md)-2px)] shrink-0 ${i === active ? 'bg-primary text-primary-fg' : 'bg-bg text-muted border border-border'}`}>
                    <NavIcon name={it.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{it.label}</span>
                    {it.hint && <span className="block truncate text-xs text-muted">{it.hint}</span>}
                  </span>
                  {i === active && <NavIcon name="arrow" size={15} className="text-muted shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-border text-[11px] text-muted bg-bg/50">
          <span className="inline-flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> move</span>
          <span className="inline-flex items-center gap-1.5"><span className="kbd">↵</span> open</span>
          <span className="inline-flex items-center gap-1.5 ml-auto"><span className="kbd">Ctrl</span><span className="kbd">K</span> anywhere</span>
        </div>
      </div>
    </div>
  );
}
