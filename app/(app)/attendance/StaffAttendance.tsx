// =============================================================================
// FILE: app/(app)/attendance/StaffAttendance.tsx   (NEW FILE — server)
// Attendance hub for mentors (their programs) and admins (all programs).
// =============================================================================

import Link from 'next/link';
import { attendanceOverview } from '@/lib/attendance-reports';
import { getSettings } from '@/lib/settings';
import type { SessionUser } from '@/lib/auth-helpers';
import { PageHeader, Panel, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { formatDateTimeWeekday } from '@/lib/time';
import LearnerTable from './LearnerTable';

const RANGES = [
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: 0 },
];

export default async function StaffAttendance({ user, searchParams }: { user: SessionUser; searchParams: { program?: string; range?: string } }) {
  const s = await getSettings();
  const range = RANGES.find((r) => r.id === searchParams.range) ?? RANGES[1];
  const o = await attendanceOverview(user, {
    programId: searchParams.program || undefined,
    days: range.days || undefined,
    threshold: s.attendanceThreshold,
    streakAlert: s.absenceStreakAlert,
  });
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(searchParams.program ? { program: searchParams.program } : {}), range: range.id, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/attendance?${p.toString()}`;
  };
  const exportHref = `/attendance/export?${new URLSearchParams({ ...(searchParams.program ? { program: searchParams.program } : {}), range: range.id }).toString()}`;

  const tiles = [
    { label: 'Average rate', value: o.totals.avgRate === null ? '—' : `${Math.round(o.totals.avgRate * 100)}%`, icon: 'progress' as const },
    { label: `Below ${s.attendanceThreshold}%`, value: o.totals.low, icon: 'attendance' as const, tone: o.totals.low ? 'text-danger' : '' },
    { label: `${s.absenceStreakAlert || '–'}+ absences in a row`, value: o.totals.repeated, icon: 'bell' as const, tone: o.totals.repeated ? 'text-warning' : '' },
    { label: 'Registers missing', value: o.missing.length, icon: 'sessions' as const, tone: o.missing.length ? 'text-warning' : '' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={user.role === 'admin' ? 'All programs' : 'Your programs'}
        title="Attendance"
        subtitle={`${o.totals.sessions} sessions · ${o.totals.records} records · ${range.label.toLowerCase()}`}
        actions={
          <>
            {user.role === 'admin' && (
              <Link href="/admin/settings?section=attendanceRules" className="btn-outline h-10 px-4 text-sm">
                Alert rules
              </Link>
            )}
            <a href={exportHref} className="btn-primary h-10 px-4 text-sm">
              Export CSV
            </a>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <form action="/attendance" className="flex gap-2">
          <input type="hidden" name="range" value={range.id} />
          <select name="program" defaultValue={searchParams.program ?? ''} className="input h-10 text-sm sm:w-64" aria-label="Program">
            <option value="">All {user.role === 'admin' ? '' : 'my '}programs</option>
            {o.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn-outline h-10 px-3 text-sm">Show</button>
        </form>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={qs({ range: r.id })}
              role="tab"
              aria-selected={r.id === range.id}
              className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${
                r.id === range.id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              <NavIcon name={t.icon} size={13} /> {t.label}
            </p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${t.tone ?? ''}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {o.missing.length > 0 && (
        <Panel title="Sessions still missing attendance" icon={<NavIcon name="sessions" size={16} />} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {o.missing.slice(0, 8).map((m) => (
              <li key={m.id}>
                <Link href={`/sessions/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-hero/40 transition">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{m.title}</span>
                    <span className="block text-xs text-muted truncate">
                      {m.programName} · {formatDateTimeWeekday(m.startsAt)} · {m.enrolled} learners
                    </span>
                  </span>
                  <span className="btn-outline h-8 px-3 text-xs shrink-0">Mark now</span>
                </Link>
              </li>
            ))}
          </ul>
          {o.missing.length > 8 && <p className="px-5 py-2 text-xs text-muted border-t border-border">…and {o.missing.length - 8} more.</p>}
        </Panel>
      )}

      {o.programs.length === 0 ? (
        <Panel>
          <EmptyNote title="No programs yet" text={user.role === 'admin' ? 'Create a program and add learners to see attendance here.' : 'You are not a mentor of any active program yet.'} />
        </Panel>
      ) : (
        <LearnerTable learners={o.learners} threshold={s.attendanceThreshold} streakAlert={s.absenceStreakAlert} />
      )}
    </div>
  );
}
