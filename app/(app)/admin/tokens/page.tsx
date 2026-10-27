// =============================================================================
// FILE: app/(app)/admin/tokens/page.tsx   (NEW FILE)
// Admin → Tokens: circulation, top holders, give/remove, full ledger.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { tokenOverview, recentLedger } from '@/lib/tokens';
import { TX_LABEL } from '@/lib/tokens-core';
import { listPrograms } from '@/lib/programs';
import { PageHeader, Panel, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { formatDateTime } from '@/lib/time';
import AdjustTokens from './AdjustTokens';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tokens' };

export default async function AdminTokensPage() {
  const admin = await requirePermission('tokens.view');
  const s = await getSettings();
  if (!s.tokensEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Tokens" />
        <Panel>
          <EmptyNote
            title="Tokens are switched off"
            text="A Super Admin can turn on the token currency, name it and set how people earn it."
            action={
              <Link href="/admin/settings?section=tokens" className="btn-primary">
                Token settings
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }
  const [o, ledger, canGrant, programs] = await Promise.all([tokenOverview(admin.orgId), recentLedger(admin.orgId, 100), hasPermission(admin, 'tokens.grant'), listPrograms(admin.orgId)]);
  const tiles = [
    { label: 'In circulation', value: o.circulation },
    { label: 'People holding', value: o.holders },
    { label: 'Earned (30 days)', value: o.earned30 },
    { label: 'Spent (30 days)', value: o.spent30 },
    { label: 'Given by admins (30 days)', value: o.granted30 },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={`${s.tokenIcon} ${s.tokenName}`}
        subtitle="Every movement is recorded. Balances can never go below zero."
        actions={
          <Link href="/admin/settings?section=tokens" className="btn-outline h-10 px-4 text-sm">
            Rules &amp; settings
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-surface border border-border rounded-[var(--radius-lg)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{t.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
        <Panel title="Ledger" icon={<NavIcon name="sessions" size={16} />} bodyClassName="p-0">
          {ledger.length === 0 ? (
            <EmptyNote compact title="No movements yet" />
          ) : (
            <ul className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {ledger.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">
                      {t.userName} · <span className="text-muted font-normal">{TX_LABEL[t.kind]}</span>
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {t.reason} · {formatDateTime(t.at)}
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
          {canGrant && (
            <Panel title="Give or remove" icon={<NavIcon name="plus" size={16} />}>
              <AdjustTokens tokenName={s.tokenName} programs={programs.map((p) => ({ id: p.id, name: p.name }))} />
            </Panel>
          )}
          <Panel title="Top balances" icon={<span aria-hidden>🏆</span>}>
            {o.top.length === 0 ? (
              <p className="text-sm text-muted">Nobody has tokens yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {o.top.map((u, i) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <span className="w-5 text-right text-muted tabular-nums">{i + 1}</span>
                    <Link href={`/admin/users/${u.id}`} className="flex-1 truncate hover:underline">
                      {u.name}
                    </Link>
                    <span className="tabular-nums font-medium">{u.tokens.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
