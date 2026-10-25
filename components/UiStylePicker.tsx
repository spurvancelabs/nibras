// =============================================================================
// FILE: components/UiStylePicker.tsx   (NEW FILE)
// Gallery of the 150+ design styles (Glassmorphism, Neumorphism, Windows 95,
// Cyberpunk HUD, Art Deco …). Each card is a real mini preview rendered with
// that style and the current colours. Hover = live preview, click = select.
// Only the fonts of the styles on screen are loaded (tiny letter subsets).
// =============================================================================

'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { UI_STYLES, UI_STYLE_CATEGORIES, uiStylePreviewVars, type UiStyle } from '@/lib/ui-styles';
import { UI_FONTS } from '@/lib/ui-fonts';
import NavIcon from './NavIcon';

type Props = {
  value: string | null;
  onSelect: (style: UiStyle | null) => void;
  onPreview?: (style: UiStyle | null) => void;
  /** First card meaning "follow the organisation style" (Profile page). */
  noneLabel?: string;
  /** Preview in dark mode. */
  dark?: boolean;
};

const LETTERS = encodeURIComponent('AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789-&');

function fontsFor(styles: UiStyle[]): string | null {
  const specs = Array.from(new Set(styles.flatMap((s) => s.fonts).map((k) => UI_FONTS[k]?.g).filter(Boolean))) as string[];
  if (!specs.length) return null;
  return `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join('&')}&text=${LETTERS}&display=swap`;
}

const StyleCard = memo(function StyleCard({
  s,
  active,
  dark,
  onSelect,
  onPreview,
}: {
  s: UiStyle;
  active: boolean;
  dark: boolean;
  onSelect: (s: UiStyle) => void;
  onPreview?: (s: UiStyle | null) => void;
}) {
  const vars = useMemo(() => uiStylePreviewVars(s, dark), [s, dark]);
  return (
    <button
      type="button"
      onClick={() => onSelect(s)}
      onMouseEnter={() => onPreview?.(s)}
      onFocus={() => onPreview?.(s)}
      aria-pressed={active}
      title={`${s.name} — ${s.description}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '190px' } as React.CSSProperties}
      className={`relative text-left rounded-[var(--radius-md)] border p-2 bg-surface transition-colors ${
        active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/60'
      }`}
    >
      {/* Mini preview in this style */}
      <div
        className="relative isolate h-[104px] overflow-hidden rounded-[calc(var(--radius-md)-2px)] border border-black/5"
        style={{ ...(vars as React.CSSProperties), background: 'var(--color-bg)', fontFamily: 'var(--ui-font-body, var(--font-sans))' }}
        aria-hidden
      >
        <div className="absolute inset-0 -z-10" style={{ background: 'var(--ui-backdrop, none)', backgroundSize: 'var(--ui-backdrop-size, auto)' }} />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'var(--ui-pattern-color)',
            WebkitMask: 'var(--ui-pattern, none)',
            mask: 'var(--ui-pattern, none)',
            opacity: 'var(--ui-pattern-opacity, 0)' as unknown as number,
          }}
        />
        <div className="absolute inset-x-2.5 top-2.5 bg-surface border border-border rounded-[var(--radius-lg)] p-2">
          <p
            className="text-[13px] font-bold leading-none truncate"
            style={{
              fontFamily: 'var(--font-heading, inherit)',
              textTransform: 'var(--ui-heading-case, none)' as React.CSSProperties['textTransform'],
              textShadow: 'var(--ui-heading-glow, none)',
            }}
          >
            {s.name}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="btn-primary !px-2 !py-0.5 text-[10px] pointer-events-none">Go</span>
            <span className="flex-1 input !py-0.5 !px-1.5 text-[9px] text-muted pointer-events-none">Search…</span>
          </div>
        </div>
        <div className="absolute left-2.5 bottom-2.5 flex gap-1.5">
          <span className="bg-surface border border-border rounded-[var(--radius-md)] w-9 h-5" />
          <span className="bg-surface border border-border rounded-[var(--radius-md)] w-6 h-5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 min-w-0">
        <p className="text-[13px] font-medium truncate">{s.name}</p>
        {s.mode === 'dark' && (
          <span className="shrink-0 text-[10px] px-1.5 rounded-full border border-border text-muted" title="Looks best in dark mode">
            dark
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted leading-snug line-clamp-2 min-h-[2.4em]">{s.description}</p>
      {active && (
        <span className="absolute top-1 right-1 grid place-items-center w-5 h-5 rounded-full bg-primary text-primary-fg shadow" aria-hidden>
          <NavIcon name="attendance" size={12} />
        </span>
      )}
    </button>
  );
});

export default function UiStylePicker({ value, onSelect, onPreview, noneLabel, dark = false }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return UI_STYLES.filter(
      (s) => (cat === 'All' || s.category === cat) && (!term || `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(term))
    );
  }, [q, cat]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of UI_STYLES) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, []);

  // Load the fonts of (at most 40) styles in view — letters only, so it's light.
  const href = useMemo(() => fontsFor(list.slice(0, 40)), [list]);
  const selected = value ? UI_STYLES.find((s) => s.id === value) : null;

  // Non-blocking font load (never delays or breaks the page if fonts are blocked).
  useEffect(() => {
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative sm:w-72">
          <NavIcon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input h-10 pl-9 text-sm"
            placeholder={`Search ${UI_STYLES.length} styles — glass, neon, retro…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search design styles"
          />
        </div>
        <p className="text-xs text-muted">
          {list.length} of {UI_STYLES.length} styles
          {selected && (
            <>
              {' '}
              · selected <b className="text-text">{selected.name}</b>
            </>
          )}
        </p>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Style categories">
        {['All', ...UI_STYLE_CATEGORIES].map((c) => (
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
            {c === 'Deluxe' && <span aria-hidden>✨</span>}
            {c}
            <span className="opacity-70 tabular-nums">{c === 'All' ? UI_STYLES.length : counts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 max-h-[560px] overflow-y-auto overscroll-contain p-0.5 pr-1"
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
            <div className="h-[104px] rounded-[calc(var(--radius-md)-2px)] border border-dashed border-border grid place-items-center text-[11px] text-muted">
              Organisation
            </div>
            <p className="mt-2 text-[13px] font-medium">{noneLabel}</p>
            <p className="text-[11px] text-muted leading-snug">Follow the admin&apos;s style</p>
          </button>
        )}
        {list.map((s) => (
          <StyleCard key={s.id} s={s} active={s.id === value} dark={dark} onSelect={onSelect} onPreview={onPreview} />
        ))}
        {list.length === 0 && <p className="col-span-full text-sm text-muted py-6 text-center">No styles match “{q}”.</p>}
      </div>
    </div>
  );
}
