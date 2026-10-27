'use client';

// =============================================================================
// FILE: app/(app)/admin/premium/PlansPanel.tsx   (NEW FILE)
// Create and edit Premium plans (Super Admin).
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, useToast } from '@/components/feedback';
import { Badge, EmptyNote, Panel } from '@/components/ui';
import { Toggle } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import type { Plan, PlanInput } from '@/lib/premium-plans';
import { savePlanAction } from './actions';

const EMPTY: PlanInput = { name: '', description: '', days: 30, tokenPrice: 0, priceLabel: '', highlight: false, active: true, sort: 0 };

export default function PlansPanel({ plans, canEdit, tokensOn, tokenName }: { plans: Plan[]; canEdit: boolean; tokensOn: boolean; tokenName: string }) {
  const [edit, setEdit] = useState<{ id?: string; plan: PlanInput } | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setEdit((e) => (e ? { ...e, plan: { ...e.plan, [k]: v } } : e));

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => (setErr(''), setEdit({ plan: EMPTY }))}>
            <NavIcon name="plus" size={16} /> New plan
          </button>
        </div>
      )}
      {plans.length === 0 ? (
        <Panel>
          <EmptyNote
            icon={<NavIcon name="crown" />}
            title="No plans yet"
            text={tokensOn ? `Plans appear on the Premium page. With a ${tokenName} price, members can buy them themselves.` : 'Plans appear on the Premium page. Turn on tokens to let members buy them themselves.'}
          />
        </Panel>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {plans.map((p) => (
            <li key={p.id} className={`p-4 rounded-[var(--radius-lg)] border bg-surface ${p.active ? 'border-border' : 'border-dashed border-border opacity-70'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.days ? `${p.days} days` : 'Lifetime'}
                    {p.tokenPrice ? ` · ${p.tokenPrice} ${tokenName}` : ''}
                    {p.priceLabel ? ` · ${p.priceLabel}` : ''}
                  </p>
                </div>
                {!p.active && <Badge tone="muted">hidden</Badge>}
                {p.highlight && <Badge tone="primary">featured</Badge>}
              </div>
              {p.description && <p className="mt-2 text-sm text-muted line-clamp-3">{p.description}</p>}
              {canEdit && (
                <button type="button" className="btn-outline h-8 px-3 text-xs mt-3" onClick={() => (setErr(''), setEdit({ id: p.id, plan: { ...p } }))}>
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit plan' : 'New plan'}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                edit &&
                start(async () => {
                  const r = await savePlanAction({ id: edit.id, plan: edit.plan });
                  if (r.ok) {
                    toast.success('Plan saved.');
                    setEdit(null);
                    router.refresh();
                  } else setErr(r.error);
                })
              }
            >
              {pending ? 'Saving…' : 'Save plan'}
            </button>
          </>
        }
      >
        {edit && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="font-medium">Name</span>
              <input className="input mt-1.5" maxLength={60} value={edit.plan.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Monthly, Semester, Lifetime" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-medium">Days (0 = lifetime)</span>
                <input type="number" min={0} max={3650} className="input mt-1.5" value={edit.plan.days} onChange={(e) => set('days', Math.max(0, Math.min(3650, Math.round(Number(e.target.value) || 0))))} />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Price in {tokenName}</span>
                <input type="number" min={0} className="input mt-1.5" value={edit.plan.tokenPrice} onChange={(e) => set('tokenPrice', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Price label (optional)</span>
              <input className="input mt-1.5" maxLength={40} value={edit.plan.priceLabel} onChange={(e) => set('priceLabel', e.target.value)} placeholder="e.g. PKR 1,500 — paid at the office" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Description</span>
              <textarea className="input mt-1.5 min-h-20" maxLength={500} value={edit.plan.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <Toggle checked={edit.plan.highlight} onChange={(v) => set('highlight', v)} label="Feature this plan" />
            <Toggle checked={edit.plan.active} onChange={(v) => set('active', v)} label="Show on the Premium page" description="Hiding a plan never affects people who already bought it." />
            {err && (
              <p role="alert" className="text-sm text-danger">
                {err}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
