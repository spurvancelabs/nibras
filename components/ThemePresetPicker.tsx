// =============================================================================
// FILE: components/ThemePresetPicker.tsx   (NEW FILE)
// Searchable, filterable grid of the 120+ theme presets. Used by Admin →
// Settings (organisation theme) and Profile (personal theme).
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import { THEME_PRESETS, THEME_CATEGORY_NAMES, type ThemePreset } from '@/lib/theme-config';

type Props = {
  value: string | null;
  onSelect: (preset: ThemePreset | null) => void;
  /** Show a first card that means "no personal theme" (Profile page). */
  noneLabel?: string;
  /** Optional preview hook (e.g. live preview on hover). */
  onPreview?: (preset: ThemePreset | null) => void;
};

export default function ThemePresetPicker({ value, onSelect, noneLabel, onPreview }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return THEME_PRESETS.filter(
      (p) =>
        (cat === 'All' || (p.category ?? 'Other') === cat) &&
        (!term ||
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          (p.category ?? '').toLowerCase().includes(term))
    );
  }, [q, cat]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of THEME_PRESETS) m.set(p.category ?? 'Other', (m.get(p.category ?? 'Other') ?? 0) + 1);
    return m;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative sm:w-64">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="input h-9 pl-9 text-sm"
            placeholder={`Search ${THEME_PRESETS.length} themes…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search themes"
          />
        </div>
        <p className="text-xs text-muted">
          {list.length} theme{list.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Theme categories">
        {['All', ...THEME_CATEGORY_NAMES].map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition ${
              cat === c ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {c}
            <span className="ml-1 opacity-70 tabular-nums">{c === 'All' ? THEME_PRESETS.length : counts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-[480px] overflow-y-auto overscroll-contain pr-1"
        onMouseLeave={() => onPreview?.(null)}
      >
        {noneLabel && !q && cat === 'All' && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={!value}
            className={`text-left rounded-[var(--radius-md)] border p-2 transition ${
              !value ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary'
            }`}
          >
            <div className="h-12 rounded-md border border-dashed border-border grid place-items-center text-[11px] text-muted">
              Organisation
            </div>
            <p className="mt-2 text-sm font-medium">{noneLabel}</p>
            <p className="text-[11px] text-muted leading-snug">Follow the admin&apos;s theme</p>
          </button>
        )}
        {list.map((p) => {
          const active = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              onMouseEnter={() => onPreview?.(p)}
              onFocus={() => onPreview?.(p)}
              aria-pressed={active}
              title={`${p.name} — ${p.description}`}
              className={`relative text-left rounded-[var(--radius-md)] border p-2 transition ${
                active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary'
              }`}
            >
              <div className="flex h-12 overflow-hidden rounded-md">
                <span className="flex-[3] flex items-end p-1" style={{ background: p.light.heroBg }}>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: p.light.primary, color: p.light.primaryFg }}>
                    Aa
                  </span>
                </span>
                <span className="flex-1" style={{ background: p.light.accent }} />
                <span className="flex-[2] flex items-end p-1" style={{ background: p.dark.bg }}>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: p.dark.primary, color: p.dark.primaryFg }}>
                    Aa
                  </span>
                </span>
              </div>
              <p className="mt-2 text-sm font-medium truncate">{p.name}</p>
              <p className="text-[11px] text-muted leading-snug truncate">{p.category ?? p.description}</p>
              {active && (
                <span className="absolute top-1 right-1 grid place-items-center w-5 h-5 rounded-full bg-primary text-primary-fg text-[11px]" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full text-sm text-muted py-6 text-center">No themes match “{q}”.</p>}
      </div>
    </div>
  );
}
