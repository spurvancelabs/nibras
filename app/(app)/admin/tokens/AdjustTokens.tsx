'use client';

// =============================================================================
// FILE: app/(app)/admin/tokens/AdjustTokens.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useSudo, useToast } from '@/components/feedback';
import { adjustTokensAction } from './actions';

export default function AdjustTokens({ tokenName, programs }: { tokenName: string; programs: { id: string; name: string }[] }) {
  const [f, setF] = useState({ emails: '', programId: '', amount: 50, reason: '' });
  const [mode, setMode] = useState<'give' | 'remove'>('give');
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const sudo = useSudo();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const amount = mode === 'give' ? f.amount : -f.amount;
        if (!(await confirm({ title: `${mode === 'give' ? 'Give' : 'Remove'} ${f.amount} ${tokenName}?`, body: f.programId ? 'Everyone in the chosen program' + (f.emails ? ' and the listed emails' : '') + '.' : 'To the listed emails.', tone: mode === 'remove' ? 'danger' : 'primary', confirmLabel: mode === 'give' ? 'Give' : 'Remove' }))) return;
        start(async () => {
          const r = await sudo(() => adjustTokensAction({ ...f, amount }));
          if (r.ok) {
            toast.success(`Done for ${r.changed} ${r.changed === 1 ? 'person' : 'people'}${r.skipped ? ` · ${r.skipped} skipped (not enough balance)` : ''}.`);
            setF({ ...f, emails: '', reason: '' });
            router.refresh();
          } else if (r.error !== 'Cancelled') toast.error(r.error);
        });
      }}
    >
      <div className="inline-flex p-1 rounded-full border border-border bg-bg/60" role="tablist">
        {(['give', 'remove'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-8 px-4 rounded-full text-sm font-medium ${mode === m ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text'}`}>
            {m === 'give' ? 'Give' : 'Remove'}
          </button>
        ))}
      </div>
      <textarea className="input min-h-20 text-sm" placeholder="Emails (comma or new line)" value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} aria-label="Emails" />
      <select className="input text-sm" value={f.programId} onChange={(e) => setF({ ...f, programId: e.target.value })} aria-label="Whole program">
        <option value="">…and/or a whole program</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input className="input w-28 tabular-nums" type="number" min={1} max={1000000} value={f.amount} onChange={(e) => setF({ ...f, amount: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="Amount" />
        <input className="input flex-1" maxLength={300} placeholder="Reason (shown to them)" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} aria-label="Reason" />
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Working…' : mode === 'give' ? `Give ${tokenName}` : `Remove ${tokenName}`}
      </button>
    </form>
  );
}
