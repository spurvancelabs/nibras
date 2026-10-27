// =============================================================================
// FILE: app/(app)/wallet/page.tsx   (NEW FILE)
// Token wallet: balance, how to earn, history, send (if allowed), leaderboard.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { balanceOf, history, earnedThisMonth, leaderboard } from '@/lib/tokens';
import { TOKEN_RULES, TX_LABEL } from '@/lib/tokens-core';
import { PageHeader, Panel, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { formatDateTime } from '@/lib/time';
import SendTokens from './SendTokens';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wallet' };

export default async function WalletPage() {
  const user = await requireAuth();
  const s = await getSettings();
  if (!s.tokensEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Wallet" />
        <Panel>
          <EmptyNote title="Tokens are switched off" text="Your organisation hasn't turned on the token currency." />
        </Panel>
      </div>
    );
  }
  const [balance, tx, month, board] = await Promise.all([
    balanceOf(user.orgId, user.id),
    history(user.orgId, user.id, 60),
    earnedThisMonth(user.orgId, user.id),
    s.tokenLeaderboard ? leaderboard(user.orgId, 20) : Promise.resolve([]),
  ]);
  const rules = TOKEN_RULES.filter((r) => (s.tokenRules?.[r.key] ?? 0) > 0);
  const icon = s.tokenIcon;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Wallet" subtitle={`Your ${s.tokenName} — earn them by learning, spend them on Premium, sessions and courses.`} />

      <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-hero p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Balance</p>
            <p className="mt-1 text-4xl sm:text-5xl font-semibold tabular-nums">
              <span aria-hidden>{icon}</span> {balance.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted">
              {s.tokenName} · earned {month.toLocaleString()} this month
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.premiumEnabled && (
              <Link href="/premium" className="btn-primary h-10 px-4 text-sm">
                <NavIcon name="crown" size={16} /> Spend on Premium
              </Link>
            )}
            {s.featureCourses && (
              <Link href="/courses" className="btn-outline h-10 px-4 text-sm">
                Browse courses
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start">
        <Panel title="History" icon={<NavIcon name="sessions" size={16} />} bodyClassName="p-0">
          {tx.length === 0 ? (
            <EmptyNote compact title="Nothing yet" text="Attend sessions, hand in work and pass quizzes to earn your first tokens." />
          ) : (
            <ul className="divide-y divide-border">
              {tx.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 text-sm font-semibold ${t.amount > 0 ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger'}`} aria-hidden>
                    {t.amount > 0 ? '+' : '−'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{t.reason || TX_LABEL[t.kind]}</span>
                    <span className="block text-xs text-muted">
                      {TX_LABEL[t.kind]} · {formatDateTime(t.at)}
                    </span>
                  </span>
                  <span className={`tabular-nums font-semibold ${t.amount > 0 ? 'text-success' : 'text-danger'}`}>
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6 min-w-0">
          {s.tokenTransfers && (
            <Panel title={`Send ${s.tokenName}`} icon={<NavIcon name="arrow" size={16} />}>
              <SendTokens tokenName={s.tokenName} max={Math.min(balance, s.tokenTransferDailyMax)} />
            </Panel>
          )}
          {rules.length > 0 && (
            <Panel title="How to earn" icon={<NavIcon name="award" size={16} />}>
              <ul className="space-y-2 text-sm">
                {rules.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3">
                    <span>{r.label}</span>
                    <span className="tabular-nums font-semibold">
                      +{s.tokenRules[r.key]} <span aria-hidden>{icon}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {s.tokenDailyCap > 0 && <p className="mt-3 text-xs text-muted">Up to {s.tokenDailyCap} per day from rewards.</p>}
            </Panel>
          )}
          {s.tokenLeaderboard && board.length > 0 && (
            <Panel title="This month's top learners" icon={<span aria-hidden>🏆</span>}>
              <ol className="space-y-2 text-sm">
                {board.map((b, i) => (
                  <li key={b.userId} className={`flex items-center gap-3 ${b.userId === user.id ? 'font-semibold' : ''}`}>
                    <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span>
                    <span className="flex-1 truncate">
                      {b.name}
                      {b.userId === user.id ? ' (you)' : ''}
                    </span>
                    <span className="tabular-nums">
                      {b.earned} <span aria-hidden>{icon}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
