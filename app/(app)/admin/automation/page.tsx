// =============================================================================
// FILE: app/(app)/admin/automation/page.tsx   (NEW FILE)
// Admin → Account automation (inactive accounts).
//   Rules    — what counts as inactive and what happens (Super Admin edits)
//   Review   — flagged and paused accounts: reactivate / exempt / dismiss
//   History  — every run (scheduled, manual, dry runs)
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/auth-helpers';
import { listRules, listFlags, listRuns } from '@/lib/automation';
import { listPrograms } from '@/lib/programs';
import { db } from '@/lib/db';
import User from '@/models/User';
import { PageHeader } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { RulesPanel, ReviewPanel, HistoryPanel } from './AutomationAdmin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Account automation' };

export default async function AutomationPage({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const admin = await requirePermission('automation.view');
  const sp = await searchParams;
  const tab = sp.tab === 'flags' ? 'flags' : sp.tab === 'history' ? 'history' : 'rules';

  const [canConfigure, canRun, canReview, rules, programs, openFlags] = await Promise.all([
    hasPermission(admin, 'automation.configure'),
    hasPermission(admin, 'automation.run'),
    hasPermission(admin, 'automation.review'),
    listRules(admin.orgId),
    listPrograms(admin.orgId),
    listFlags(admin.orgId, ['flagged', 'suspended'], 500),
  ]);

  const stage = sp.stage === 'reminded' ? 'reminded' : sp.stage === 'resolved' ? 'resolved' : 'review';
  const [flags, runs, exempt] = await Promise.all([
    tab === 'flags' ? (stage === 'review' ? Promise.resolve(openFlags) : listFlags(admin.orgId, [stage], 300)) : Promise.resolve([]),
    tab === 'history' ? listRuns(admin.orgId, 50) : Promise.resolve([]),
    tab === 'flags'
      ? db().then(
          async () =>
            (await User.find({ orgId: admin.orgId, automationExempt: true }).select('name email role').sort({ name: 1 }).limit(300).lean()) as {
              _id: unknown;
              name: string;
              email: string;
              role: string;
            }[]
        )
      : Promise.resolve([]),
  ]);

  const tabs = [
    { id: 'rules', label: 'Rules', count: rules.length },
    { id: 'flags', label: 'Review', count: openFlags.length },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Account automation"
        subtitle="Gently follow up with inactive learners — remind them, flag them for review, and only pause accounts if you choose to. Nothing is ever deleted."
      />

      {!canConfigure && (
        <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-hero/50 text-sm">
          <NavIcon name="shield" size={18} className="shrink-0 mt-0.5" />
          <p>Rules are set by the Super Admin. You can preview who they affect{canReview ? ' and review flagged accounts' : ''}.</p>
        </div>
      )}

      <nav aria-label="Automation sections" className="flex gap-1.5 border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/automation?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`h-10 px-4 -mb-px inline-flex items-center gap-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[11px] px-1.5 rounded-full ${t.id === 'flags' ? 'bg-warning/20 text-warning' : 'bg-hero text-muted'}`}>{t.count}</span>
            )}
          </Link>
        ))}
      </nav>

      {tab === 'rules' && (
        <RulesPanel rules={rules} programs={programs.map((p) => ({ id: p.id, name: p.name }))} canConfigure={canConfigure} canRun={canRun} />
      )}
      {tab === 'flags' && (
        <ReviewPanel
          flags={flags}
          stage={stage}
          canReview={canReview}
          exempt={exempt.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role }))}
        />
      )}
      {tab === 'history' && <HistoryPanel runs={runs} />}
    </div>
  );
}
