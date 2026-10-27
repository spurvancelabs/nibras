'use client';

// =============================================================================
// FILE: app/(app)/premium/PlanCards.tsx   (NEW FILE)
// Premium plans on the member page; "Buy with tokens" when possible.
// =============================================================================

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from '@/components/feedback';
import type { Plan } from '@/lib/premium-plans';
import { buyPlanAction } from './actions';

export default function PlanCards({
  plans,
  tokensOn,
  tokenName,
  tokenIcon,
  balance,
  canBuy,
}: {
  plans: Plan[];
  tokensOn: boolean;
  tokenName: string;
  tokenIcon: string;
  balance: number;
  canBuy: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  async function buy(p: Plan) {
    const ok = await confirm({
      title: `Buy “${p.name}” for ${p.tokenPrice} ${tokenName}?`,
      body: `${p.days ? `${p.days} days` : 'Lifetime'} of Premium, added on top of any time you already have. You have ${balance}.`,
      confirmLabel: 'Buy',
    });
    if (!ok) return;
    const idem = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    start(async () => {
      const r = await buyPlanAction({ planId: p.id, idem });
      if (r.ok) {
        toast.success('Premium activated — enjoy!');
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {plans.map((p) => {
        const tokenBuy = tokensOn && p.tokenPrice > 0;
        return (
          <li
            key={p.id}
            className={`relative flex flex-col p-5 rounded-[var(--radius-lg)] border bg-surface ${p.highlight ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
          >
            {p.highlight && <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-fg text-[10px] font-bold uppercase tracking-wider">Best value</span>}
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs text-muted">{p.days ? `${p.days} days` : 'Lifetime'}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {tokenBuy ? (
                <>
                  <span aria-hidden>{tokenIcon}</span> {p.tokenPrice.toLocaleString()}
                </>
              ) : (
                p.priceLabel || '—'
              )}
            </p>
            {tokenBuy && p.priceLabel && <p className="text-xs text-muted">or {p.priceLabel} (ask an admin)</p>}
            {p.description && <p className="mt-2 text-sm text-muted flex-1">{p.description}</p>}
            <div className="mt-4">
              {tokenBuy && canBuy ? (
                <button type="button" className={p.highlight ? 'btn-primary w-full' : 'btn-outline w-full'} disabled={pending || balance < p.tokenPrice} onClick={() => buy(p)}>
                  {balance < p.tokenPrice ? `Need ${p.tokenPrice - balance} more` : pending ? 'Working…' : `Buy with ${tokenName}`}
                </button>
              ) : (
                <p className="text-xs text-muted">Ask your admin, or redeem a code below.</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
