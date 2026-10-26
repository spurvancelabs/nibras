// =============================================================================
// FILE: app/(app)/admin/reports/page.tsx   (NEW FILE)
// Admin reports: program summaries (CSV export), grading & AI, attendance,
// inactivity, premium & appearance usage, and system health.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/auth-helpers';
import { programSummaries, appearanceUsage, automationSummary, aiSummary, systemHealth } from '@/lib/reports';
import { listRuns } from '@/lib/automation';
import { getSettings } from '@/lib/settings';
import { PageHeader, Panel, Badge } from '@/components/ui';
import { BarList } from '@/components/charts';
import NavIcon from '@/components/NavIcon';
import { formatDateTime, formatRelative } from '@/lib/time';
import ProgramTable from './ProgramTable';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const admin = await requirePermission('reports.view');
  const [programs, usage, auto, ai, health, s, canHealth, runs] = await Promise.all([
    programSummaries(admin.orgId),
    appearanceUsage(admin.orgId),
    automationSummary(admin.orgId),
    aiSummary(admin.orgId),
    systemHealth(admin.orgId),
    getSettings(),
    hasPermission(admin, 'security.view'),
    listRuns(admin.orgId, 8),
  ]);
  const active = programs.filter((p) => p.status === 'active');
  const learners = active.reduce((a, p) => a + p.learners, 0);
  const ungraded = programs.reduce((a, p) => a + p.ungraded, 0);
  const rates = active.map((p) => p.attendanceRate).filter((r): r is number => r !== null);
  const avgAtt = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : null;
  const problems = health.checks.filter((c) => c.ok === false).length + health.jobs.filter((j) => j.ok === false).length;

  const tiles = [
    { label: 'Active programs', value: active.length, icon: 'programs' as const },
    { label: 'Learners enrolled', value: learners, icon: 'users' as const },
    { label: 'Average attendance', value: avgAtt === null ? '—' : `${avgAtt}%`, icon: 'attendance' as const },
    { label: 'Waiting for a grade', value: ungraded, icon: 'grading' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Reports"
        subtitle="How your programs are doing, and whether the system is healthy."
        actions={
          <a href="/admin/reports/export" className="btn-primary h-10 px-4 text-sm">
            Export programs CSV
          </a>
        }
      />

      {problems > 0 && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-warning/50 bg-warning/10 text-sm">
          <NavIcon name="bell" size={18} className="text-warning shrink-0" />
          <p className="flex-1">
            <b>{problems} system check{problems === 1 ? ' needs' : 's need'} attention</b> — see System health below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              <NavIcon name={t.icon} size={13} /> {t.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Programs" icon={<NavIcon name="programs" size={16} />}>
        <ProgramTable rows={programs} />
      </Panel>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Grading & AI (30 days)" icon={<NavIcon name="grading" size={16} />} action={<Link href="/grading" className="text-xs underline text-muted">Queue</Link>}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">AI requests this month</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {ai.requests}
                <span className="text-sm font-normal text-muted">/{s.aiMonthlyLimit}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Approved AI grades</dt>
              <dd className="text-xl font-semibold tabular-nums">{ai.approved}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Edited by mentors</dt>
              <dd className="text-xl font-semibold tabular-nums">{ai.approved ? `${Math.round((ai.edited / ai.approved) * 100)}%` : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rejected</dt>
              <dd className="text-xl font-semibold tabular-nums">{ai.rejected}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">A high edit rate means the rubrics or guidance may need tuning.</p>
        </Panel>

        <Panel title="Inactive accounts" icon={<NavIcon name="automation" size={16} />} action={<Link href="/admin/automation?tab=flags" className="text-xs underline text-muted">Review</Link>}>
          <BarList
            rows={[
              { label: 'Reminded', value: auto.reminded },
              { label: 'Flagged for review', value: auto.flagged },
              { label: 'Paused', value: auto.suspended },
              { label: 'Resolved (30 days)', value: auto.resolved30 },
            ]}
          />
        </Panel>

        <Panel title="Appearance" icon={<NavIcon name="palette" size={16} />}>
          <p className="text-sm mb-3">
            <b>{usage.personalised}</b> of {usage.total} people chose their own look
            {s.premiumEnabled ? (
              <>
                {' '}
                · <b>{usage.premiumActive}</b> premium
              </>
            ) : null}
            .
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Top themes</p>
          <BarList rows={usage.themes.slice(0, 5)} />
        </Panel>
      </div>

      <Panel title="System health" icon={<NavIcon name="shield" size={16} />}>
        <div className="grid lg:grid-cols-2 gap-6">
          <ul className="space-y-2">
            {health.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5 text-sm">
                <span aria-hidden className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${c.ok === true ? 'bg-success' : c.ok === false ? 'bg-danger' : 'bg-muted/50'}`} />
                <span>
                  <b>{c.label}</b> <span className="sr-only">{c.ok === true ? 'OK' : c.ok === false ? 'problem' : 'not used'}</span>
                  <span className="block text-xs text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Daily jobs</p>
            <ul className="space-y-2">
              {health.jobs.map((j) => (
                <li key={j.job} className="flex items-center gap-2.5 text-sm">
                  <span aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 ${j.ok === true ? 'bg-success' : j.ok === false ? 'bg-danger' : 'bg-muted/50'}`} />
                  <span className="capitalize font-medium w-24">{j.job}</span>
                  <span className="text-xs text-muted" title={j.at ? formatDateTime(j.at) : undefined}>
                    {j.at ? formatRelative(j.at) : '—'} · {j.detail}
                  </span>
                </li>
              ))}
            </ul>
            {runs.length > 0 && (
              <p className="mt-3 text-xs">
                <Link href="/admin/automation?tab=history" className="underline text-muted">
                  All runs →
                </Link>
              </p>
            )}
            {canHealth && (
              <p className="mt-2 text-xs">
                <Link href="/admin/security" className="underline text-muted">
                  Security dashboard →
                </Link>
              </p>
            )}
          </div>
        </div>
        {health.dbMs !== null && health.dbMs > 500 && <Badge tone="warning" className="mt-4">Database is slow ({health.dbMs} ms)</Badge>}
      </Panel>
    </div>
  );
}
