// =============================================================================
// FILE: components/ui.tsx
// Small shared UI pieces used by the redesigned pages (server + client safe):
// PageHeader, Panel, Badge, SessionStatusBadge, Alert, EmptyNote, DateTile,
// ProgressRing. No hooks, no data fetching.
// =============================================================================

import Link from 'next/link';

type Tone = 'success' | 'danger' | 'warning' | 'muted' | 'primary';

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted mb-1.5">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
            {title}
          </h1>
          {subtitle && <div className="mt-1.5 text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel (card with optional header)
// ---------------------------------------------------------------------------

export function Panel({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="grid place-items-center w-8 h-8 shrink-0 rounded-[var(--radius-md)] bg-hero text-text">
                {icon}
              </span>
            )}
            <h2 className="font-semibold truncate">{title}</h2>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Small "View all →" style link for panel headers. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text transition"
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const TONE: Record<Tone, string> = {
  success: 'bg-success/12 text-success',
  danger: 'bg-danger/12 text-danger',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-muted/12 text-muted',
  primary: 'bg-primary text-primary-fg',
};

export function Badge({
  tone = 'muted',
  dot = false,
  children,
  className = '',
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${TONE[tone]} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function SessionStatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge tone="success" dot>completed</Badge>;
  if (status === 'cancelled') return <Badge tone="danger" dot>cancelled</Badge>;
  return <Badge tone="muted" dot>scheduled</Badge>;
}

// ---------------------------------------------------------------------------
// Alerts & empty states
// ---------------------------------------------------------------------------

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'error'
      ? 'bg-danger/10 text-danger'
      : tone === 'success'
      ? 'bg-success/10 text-success'
      : 'bg-hero text-text';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 px-3.5 py-3 rounded-[var(--radius-md)] text-sm ${cls}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden>
        {tone === 'success' ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </>
        )}
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyNote({
  title,
  text,
  icon,
  action,
  compact = false,
}: {
  title: React.ReactNode;
  text?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-10'} px-4`}>
      <span className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-full bg-hero text-text">
        {icon ?? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            <path d="M8 12h8" />
          </svg>
        )}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {text && <p className="mt-1 text-xs text-muted max-w-xs mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date tile (calendar-style) & progress ring
// ---------------------------------------------------------------------------

export function DateTile({ iso, muted = false }: { iso: string; muted?: boolean }) {
  const d = new Date(iso);
  return (
    <div
      className={`w-14 shrink-0 text-center rounded-[var(--radius-md)] overflow-hidden border ${
        muted ? 'border-border bg-bg' : 'border-primary bg-surface'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider py-0.5 ${
          muted ? 'bg-border/60 text-muted' : 'bg-primary text-primary-fg'
        }`}
      >
        {d.toLocaleDateString(undefined, { month: 'short' })}
      </p>
      <p className="text-xl font-semibold leading-none pt-1.5">{d.getDate()}</p>
      <p className="text-[10px] text-muted pb-1.5 pt-0.5">
        {d.toLocaleDateString(undefined, { weekday: 'short' })}
      </p>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 84,
  stroke = 8,
  label,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hero)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
        {label ?? `${Math.round(v * 100)}%`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons used across pages
// ---------------------------------------------------------------------------

const ic = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const Icons = {
  calendar: (
    <svg {...ic}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  clipboard: (
    <svg {...ic}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h6" /></svg>
  ),
  chat: (
    <svg {...ic}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  ),
  check: (
    <svg {...ic}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  programs: (
    <svg {...ic}><path d="M2 7l10-5 10 5-10 5L2 7z" /><path d="M6 9v6c0 1.5 2.7 3 6 3s6-1.5 6-3V9" /></svg>
  ),
  users: (
    <svg {...ic}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  mentor: (
    <svg {...ic}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /></svg>
  ),
  student: (
    <svg {...ic}><circle cx="12" cy="12" r="9.5" /><path d="M8 14.5c1 1.4 2.4 2 4 2s3-.6 4-2" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.4} /></svg>
  ),
  video: (
    <svg {...ic}><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></svg>
  ),
  file: (
    <svg {...ic}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  ),
  clock: (
    <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  link: (
    <svg {...ic}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  ),
  plus: (
    <svg {...ic} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>
  ),
  edit: (
    <svg {...ic}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
  ),
};