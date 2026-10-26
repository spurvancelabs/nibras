'use client';

// =============================================================================
// FILE: components/DataTable.tsx   (NEW FILE)
// Reusable table for admin screens: quick search, sortable columns, row
// selection with a bulk-action bar, pagination, empty state, and a stacked
// card layout on phones (no sideways scrolling).
//
//   <DataTable rows={rows} rowKey={r => r.id} columns={[...]}
//              searchText={r => `${r.name} ${r.email}`}
//              bulkActions={(ids, clear) => <button …/>} />
// =============================================================================

import { useMemo, useState } from 'react';
import NavIcon from './NavIcon';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting (omit = not sortable). */
  sort?: (row: T) => string | number;
  className?: string;
  /** Hide this column in the phone card layout. */
  hideOnMobile?: boolean;
  /** Text-align right (numbers). */
  numeric?: boolean;
};

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = 'Search…',
  bulkActions,
  toolbar,
  empty,
  pageSize = 25,
  initialSort,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Rendered in the bar shown while rows are selected. */
  bulkActions?: (selected: string[], clear: () => void) => React.ReactNode;
  /** Extra controls next to the search box (filters…). */
  toolbar?: React.ReactNode;
  empty?: React.ReactNode;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  caption?: string;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = term && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(term)) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) {
        const get = col.sort;
        list = [...list].sort((a, b) => {
          const va = get(a);
          const vb = get(b);
          const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
          return sort.dir === 'asc' ? r : -r;
        });
      }
    }
    return list;
  }, [rows, q, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const visible = filtered.slice(cur * pageSize, cur * pageSize + pageSize);
  const visibleIds = visible.map(rowKey);
  const allOnPage = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectable = !!bulkActions;
  const clear = () => setSelected(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function togglePage() {
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) visibleIds.forEach((id) => n.delete(id));
      else visibleIds.forEach((id) => n.add(id));
      return n;
    });
  }
  function sortBy(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <div className="space-y-3 min-w-0">
      {(searchText || toolbar) && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {searchText && (
            <div className="relative sm:w-72">
              <NavIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                className="input h-10 pl-9 text-sm"
                placeholder={searchPlaceholder}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
          <p className="sm:ml-auto text-xs text-muted tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'row' : 'rows'}
          </p>
        </div>
      )}

      {selectable && selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky top-[4.5rem] z-10 flex flex-wrap items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-primary/40 bg-surface shadow-lg animate-pop-in"
        >
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button type="button" className="text-xs text-muted hover:text-text underline" onClick={clear}>
            Clear
          </button>
          <span className="flex-1" />
          {bulkActions?.([...selected], clear)}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border py-10 text-center text-sm text-muted">
          {q ? `Nothing matches “${q}”.` : empty ?? 'Nothing here yet.'}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="hidden md:table-header-group bg-bg/60 text-xs text-muted">
              <tr>
                {selectable && (
                  <th scope="col" className="w-10 px-3 py-2.5 text-left">
                    <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={togglePage} className="accent-[var(--color-primary)]" />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2.5 font-medium ${c.numeric ? 'text-right' : 'text-left'} ${c.className ?? ''}`}>
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => sortBy(c.key)}
                        className={`inline-flex items-center gap-1 hover:text-text ${sort?.key === c.key ? 'text-text' : ''}`}
                        aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        {c.header}
                        <span aria-hidden className="text-[10px]">
                          {sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => {
                const id = rowKey(r);
                const isSel = selected.has(id);
                return (
                  <tr key={id} className={`block md:table-row px-3 py-2 md:p-0 ${isSel ? 'bg-primary/5' : 'hover:bg-hero/40'}`}>
                    {selectable && (
                      <td className="inline-block md:table-cell align-middle md:px-3 md:py-2.5 mr-2 md:mr-0">
                        <input type="checkbox" aria-label="Select row" checked={isSel} onChange={() => toggle(id)} className="accent-[var(--color-primary)]" />
                      </td>
                    )}
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={`${c.hideOnMobile ? 'hidden md:table-cell' : i === 0 ? 'inline-block md:table-cell' : 'flex md:table-cell justify-between gap-3'} align-middle md:px-3 md:py-2.5 ${
                          c.numeric ? 'md:text-right tabular-nums' : ''
                        } ${c.className ?? ''}`}
                      >
                        {i > 0 && !c.hideOnMobile && <span className="md:hidden text-xs text-muted">{c.header}</span>}
                        <span className="min-w-0">{c.cell(r)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          <button type="button" className="btn-outline h-9 px-3" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            Previous
          </button>
          <span className="text-muted tabular-nums">
            Page {cur + 1} of {pages}
          </span>
          <button type="button" className="btn-outline h-9 px-3" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
