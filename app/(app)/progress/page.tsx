// =============================================================================
// FILE: app/(app)/progress/page.tsx   (NEW FILE)
// Learner progress: what to do next, weekly learning streak, grade trend,
// key numbers and achievements. Computed live from existing records.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { learnerProgress } from '@/lib/learner-progress';
import { PageHeader, Panel, Badge, EmptyNote, ProgressRing } from '@/components/ui';
import { TrendChart } from '@/components/charts';
import NavIcon from '@/components/NavIcon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My progress' };

const KIND_ICON = { assignment: 'assignments', quiz: 'quiz', feedback: 'queries', attendance: 'attendance' } as const;

export default async function ProgressPage() {
  const user = await requireAuth();
  if (user.role !== 'student') redirect('/dashboard');
  const p = await learnerProgress(user.orgId, user.id);
  const earned = p.achievements.filter((a) => a.earned).length;

  const stats = [
    { label: 'Average grade', value: p.avgGrade === null ? '—' : `${p.avgGrade}%` },
    { label: 'On time', value: p.onTimeRate === null ? '—' : `${Math.round(p.onTimeRate * 100)}%` },
    { label: 'Attendance', value: p.attendanceRate === null ? '—' : `${Math.round(p.attendanceRate * 100)}%` },
    { label: 'Quizzes passed', value: `${p.quizzes.passed}/${p.quizzes.attempted}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title="My progress" subtitle={`${p.programs} program${p.programs === 1 ? '' : 's'} · ${p.submissions} submissions · ${earned} achievement${earned === 1 ? '' : 's'}`} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Panel title="What to do next" icon={<NavIcon name="arrow" size={16} />} bodyClassName="p-0">
            {p.next.length === 0 ? (
              <EmptyNote compact title="You're all caught up 🎉" text="New assignments and quizzes will show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {p.next.map((n, i) => (
                  <li key={i}>
                    <Link href={n.href} className="flex items-center gap-3 px-5 py-3 hover:bg-hero/40 transition">
                      <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${n.urgent ? 'bg-warning/15 text-warning' : 'bg-hero'}`}>
                        <NavIcon name={KIND_ICON[n.kind]} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{n.title}</span>
                        <span className="block text-xs text-muted truncate">{n.detail}</span>
                      </span>
                      {n.urgent && <Badge tone="warning">soon</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{s.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <Panel title="Grades over time" icon={<NavIcon name="progress" size={16} />}>
            {p.gradeTrend.length < 2 ? (
              <p className="text-sm text-muted">Your trend appears after two graded assignments.</p>
            ) : (
              <TrendChart label="Grades over time" points={p.gradeTrend.map((g) => ({ label: g.label, value: g.pct }))} max={100} unit="%" />
            )}
          </Panel>
        </div>

        <div className="space-y-6 min-w-0">
          <Panel title="Learning streak" icon={<span aria-hidden>🔥</span>}>
            <div className="flex items-center gap-4">
              <ProgressRing value={Math.min(1, p.streak.current / 12)} size={84} stroke={8} />
              <div>
                <p className="text-3xl font-semibold tabular-nums">
                  {p.streak.current} <span className="text-base font-normal text-muted">week{p.streak.current === 1 ? '' : 's'}</span>
                </p>
                <p className="text-xs text-muted">Best: {p.streak.best} weeks</p>
              </div>
            </div>
            <ol className="mt-4 grid grid-cols-12 gap-1" aria-label="Last 12 weeks">
              {p.streak.weeks.map((w) => (
                <li key={w.key} title={`${w.key}: ${w.active ? 'active' : 'no activity'}`} className={`h-6 rounded ${w.active ? 'bg-primary' : 'bg-hero'}`}>
                  <span className="sr-only">
                    {w.key} {w.active ? 'active' : 'inactive'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              {p.streak.thisWeekActive ? 'This week counts — nice!' : 'Submit work, take a quiz or attend a session this week to keep it going.'}
            </p>
          </Panel>

          <Panel title={`Achievements · ${earned}/${p.achievements.length}`} icon={<NavIcon name="award" size={16} />}>
            <ul className="grid grid-cols-2 gap-2">
              {p.achievements.map((a) => (
                <li
                  key={a.id}
                  title={a.description}
                  className={`p-3 rounded-[var(--radius-md)] border text-center ${a.earned ? 'border-primary/40 bg-primary/5' : 'border-border opacity-70'}`}
                >
                  <span className={`block text-2xl ${a.earned ? '' : 'grayscale'}`} aria-hidden>
                    {a.icon}
                  </span>
                  <span className="block mt-1 text-xs font-semibold">{a.title}</span>
                  <span className="block text-[10px] text-muted leading-tight">{a.description}</span>
                  {!a.earned && (
                    <span className="block mt-1.5 h-1 rounded-full bg-hero overflow-hidden" aria-label={`${a.progress} of ${a.goal}`}>
                      <span className="block h-full bg-primary" style={{ width: `${(a.progress / a.goal) * 100}%` }} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
