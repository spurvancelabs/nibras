// =============================================================================
// FILE: components/settings-ui.tsx   (NEW FILE)
// Small building blocks for settings-style pages (Admin → Settings, Profile):
// SettingsCard, Field, Toggle (switch row), Segmented control, RadioCards,
// RangeField. All of them follow the active colour theme + design style.
// =============================================================================

'use client';

import { useId } from 'react';

export function SettingsCard({
  title,
  description,
  icon,
  actions,
  children,
  tone = 'default',
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  tone?: 'default' | 'danger' | 'warning';
  id?: string;
}) {
  const ring = tone === 'danger' ? 'border-danger/40' : tone === 'warning' ? 'border-warning/40' : '';
  return (
    <section id={id} className={`bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden scroll-mt-28 ${ring}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        {icon && (
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] bg-hero text-text" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  aside,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  htmlFor?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
          {label}
        </label>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** A full-width switch row with a title and description. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-4 p-3.5 rounded-[var(--radius-md)] border border-border transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-hero/50'
      } ${checked ? 'bg-hero/40' : ''}`}
    >
      {icon && <span className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-bg border border-border text-lg" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
      </span>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}

export function Switch({ checked, onChange, disabled, id, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; id?: string; label?: string }) {
  return (
    <span className="relative inline-flex shrink-0 mt-0.5">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="w-11 h-6 rounded-full bg-border peer-checked:bg-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface" />
      <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 p-1 rounded-[var(--radius-md)] border border-border bg-bg/60">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[calc(var(--radius-md)-3px)] text-sm font-medium transition-colors disabled:opacity-50 ${
              active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RadioCards<T extends string>({
  value,
  onChange,
  options,
  disabled,
  columns = 2,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; badge?: React.ReactNode }[];
  disabled?: boolean;
  columns?: 2 | 3 | 4 | 5;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-5' }[columns];
  return (
    <div role="radiogroup" className={`grid grid-cols-1 ${cols} gap-2.5`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`relative text-left p-3.5 rounded-[var(--radius-md)] border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              active ? 'border-primary bg-hero/60 ring-1 ring-primary' : 'border-border hover:bg-hero/40'
            }`}
          >
            <span className="flex items-center gap-2">
              {o.icon && <span aria-hidden className="text-lg leading-none">{o.icon}</span>}
              <span className="text-sm font-semibold">{o.title}</span>
              {o.badge}
            </span>
            {o.description && <span className="block mt-1 text-xs text-muted leading-relaxed">{o.description}</span>}
            <span
              aria-hidden
              className={`absolute top-3 right-3 grid place-items-center w-4 h-4 rounded-full border ${active ? 'border-primary bg-primary' : 'border-border'}`}
            >
              {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-fg" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
  format,
}: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: React.ReactNode;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} aside={<span className="tabular-nums font-medium text-text">{format ? format(value) : `${value}${unit}`}</span>}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)] cursor-pointer"
      />
    </Field>
  );
}

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'primary' | 'success' | 'warning' | 'danger' }) {
  const cls = {
    muted: 'bg-bg text-muted border-border',
    primary: 'bg-primary/10 text-text border-primary/30',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>{children}</span>;
}
