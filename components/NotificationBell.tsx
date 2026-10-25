// =============================================================================
// FILE: components/NotificationBell.tsx
// Navbar bell + dropdown. Polls /api/notifications every 30s.
// On phones the panel is full-width under the navbar so it never overflows.
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { NotificationItem } from '@/lib/notifications';
import { formatDate } from '@/lib/time';

const POLL_MS = 30_000;

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return formatDate(iso);
}

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as {
        items: NotificationItem[];
        unread: number;
      };
      setItems(json.items);
      setUnread(json.unread);
    } catch {
      // ignore network blips
    }
  }

  // Initial + polling
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Reload when route changes (so marking read via page reflects immediately)
  useEffect(() => {
    load();
  }, [pathname]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    router.refresh();
  }

  async function onItemClick(item: NotificationItem) {
    setOpen(false);
    if (!item.readAt) {
      setUnread((n) => Math.max(0, n - 1));
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i
        )
      );
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
    }
    if (item.link) router.push(item.link);
    else router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={`relative grid place-items-center w-10 h-10 rounded-[var(--radius-md)] border border-border transition ${
          open ? 'bg-hero text-text' : 'bg-surface text-text hover:bg-hero'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-surface">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="ui-popover fixed inset-x-3 top-[4.5rem] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-3 sm:w-96 bg-surface border border-border rounded-[var(--radius-lg)] shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-fg text-[10px] font-semibold">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-muted hover:text-text transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-full bg-hero text-text">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-xs text-muted mt-1">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const unreadItem = !n.readAt;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick(n)}
                        className={`w-full text-left px-4 py-3 transition flex gap-3 ${
                          unreadItem ? 'bg-hero/50 hover:bg-hero' : 'hover:bg-bg'
                        }`}
                      >
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            unreadItem ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm truncate ${unreadItem ? 'font-semibold' : 'font-medium text-muted'}`}>
                              {n.title}
                            </p>
                            <span className="text-[11px] text-muted shrink-0 tabular-nums">
                              {fmtRelative(n.createdAt)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="text-xs text-muted line-clamp-2 mt-0.5">
                              {n.body}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block py-3 text-center text-xs font-medium text-text hover:bg-hero transition"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}