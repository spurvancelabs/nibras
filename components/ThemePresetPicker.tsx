// =============================================================================
// FILE: components/ThemePresetPicker.tsx
// Searchable gallery of the 550 colour themes in 35 categories (Deluxe and
// Anime Deluxe themes show their illustrated scene). Used by Admin → Settings
// (organisation theme) and Profile (personal theme).
// Hover/focus calls onPreview (live preview), click calls onSelect.
// =============================================================================

'use client';

import { memo, useMemo, useState } from 'react';
import { THEME_PRESETS, THEME_CATEGORY_NAMES, type ThemePreset } from '@/lib/theme-config';
import { sceneBackground } from '@/lib/theme-scenes';
import NavIcon from './NavIcon';

type Props = {
  value: string | null;
  onSelect: (preset: ThemePreset | null) => void;
  /** Show a first card that means "no personal theme" (Profile page). */
  noneLabel?: string;
  /** Optional preview hook (e.g. live preview on hover). */
  onPreview?: (preset: ThemePreset | null) => void;
};

const SPECIAL = new Set(['Deluxe', 'Anime Deluxe']);

const Card = memo(function Card({
  p,
  active,
  onSelect,
  onPreview,
}: {
  p: ThemePreset;
  active: boolean;
  onSelect: (p: ThemePreset) => void;
  onPreview?: (p: ThemePreset | null) => void;
}) {
  const scene = useMemo(() => (p.scene ? sceneBackground(p.scene, p.light, false) : null), [p]);
  return (
    <button
      type="button"
      onClick={() => onSelect(p)}
      onMouseEnter={() => onPreview?.(p)}
      onFocus={() => onPreview?.(p)}
      aria-pressed={active}
      title={`${p.name} — ${p.description}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' } as React.CSSProperties}
      className={`group relative text-left rounded-[var(--radius-md)] border p-2 bg-surface transition-colors ${
        active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/60'
      }`}
    >
      <div className="relative flex h-16 overflow-hidden rounded-[calc(var(--radius-md)-2px)]">
        <span className="relative flex-[3] flex flex-col justify-between p-1.5" style={{ background: p.light.heroBg }}>
          {scene && <span className="absolute inset-0" style={{ background: scene, opacity: 0.95 }} aria-hidden />}
          <span className="relative h-1.5 w-8 rounded-full" style={{ background: p.light.text, opacity: 0.6 }} />
          <span
            className="relative self-start px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: `linear-gradient(120deg, ${p.light.primary}, ${p.light.primary2 || p.light.primary})`, color: p.light.primaryFg }}
          >
            Aa
          </span>
        </span>
        <span className="flex-[2] flex flex-col justify-between p-1.5" style={{ background: p.dark.bg }}>
          <span className="h-1.5 w-6 rounded-full" style={{ background: p.dark.text, opacity: 0.6 }} />
          <span className="self-start px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: p.dark.primary, color: p.dark.primaryFg }}>
            Aa
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 min-w-0">
        <span className="flex -space-x-1 shrink-0" aria-hidden>
          {[p.light.primary, p.light.primary2 || p.light.primary, p.light.accent].map((c, i) => (
            <span key={i} className="w-3 h-3 rounded-full ring-1 ring-surface" style={{ background: c }} />
          ))}
        </span>
        <p className="text-[13px] font-medium truncate">{p.name}</p>
      </div>
      <p className="text-[11px] text-muted leading-snug truncate">
        {p.scene ? '✨ ' : ''}
        {p.category ?? p.description}
      </p>
      {active && (
        <span className="absolute top-1 right-1 grid place-items-center w-5 h-5 rounded-full bg-primary text-primary-fg shadow" aria-hidden>
          <NavIcon name="attendance" size={12} />
        </span>
      )}
    </button>
  );
});

export default function ThemePresetPicker({ value, onSelect, noneLabel, onPreview }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of THEME_PRESETS) m.set(p.category ?? 'Other', (m.get(p.category ?? 'Other') ?? 0) + 1);
    return m;
  }, []);

  const cats = useMemo(() => {
    // Deluxe & Anime first, then the rest in their natural order.
    const rest = THEME_CATEGORY_NAMES.filter((c) => !SPECIAL.has(c));
    return ['All', ...THEME_CATEGORY_NAMES.filter((c) => SPECIAL.has(c)), ...rest];
  }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return THEME_PRESETS.filter(
      (p) =>
        (cat === 'All' || (p.category ?? 'Other') === cat) &&
        (!term || `${p.name} ${p.description} ${p.category ?? ''}`.toLowerCase().includes(term))
    );
  }, [q, cat]);

  const selected = value ? THEME_PRESETS.find((p) => p.id === value) : null;

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative sm:w-72">
          <NavIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input h-10 pl-9 text-sm"
            placeholder={`Search ${THEME_PRESETS.length} themes — e.g. sakura, gold, ocean…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search colour themes"
          />
        </div>
        <p className="text-xs text-muted">
          {list.length} of {THEME_PRESETS.length} themes
          {selected && (
            <>
              {' '}
              · selected <b className="text-text">{selected.name}</b>
            </>
          )}
        </p>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Theme categories">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
              cat === c ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {SPECIAL.has(c) && <span aria-hidden>✨</span>}
            {c}
            <span className="opacity-70 tabular-nums">{c === 'All' ? THEME_PRESETS.length : counts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 max-h-[520px] overflow-y-auto overscroll-contain p-0.5 pr-1"
        onMouseLeave={() => onPreview?.(null)}
      >
        {noneLabel && !q && cat === 'All' && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={!value}
            className={`text-left rounded-[var(--radius-md)] border p-2 bg-surface transition-colors ${
              !value ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/60'
            }`}
          >
            <div className="h-16 rounded-[calc(var(--radius-md)-2px)] border border-dashed border-border grid place-items-center text-[11px] text-muted">
              Organisation
            </div>
            <p className="mt-2 text-[13px] font-medium">{noneLabel}</p>
            <p className="text-[11px] text-muted leading-snug">Follow the admin&apos;s theme</p>
          </button>
        )}
        {list.map((p) => (
          <Card key={p.id} p={p} active={p.id === value} onSelect={onSelect} onPreview={onPreview} />
        ))}
        {list.length === 0 && <p className="col-span-full text-sm text-muted py-6 text-center">No themes match “{q}”.</p>}
      </div>
    </div>
  );
}
