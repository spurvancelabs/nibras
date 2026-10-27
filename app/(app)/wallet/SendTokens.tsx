'use client';

// =============================================================================
// FILE: app/(app)/wallet/SendTokens.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from '@/components/feedback';
import { sendTokensAction } from './actions';

export default function SendTokens({ tokenName, max }: { tokenName: string; max: number }) {
  const [f, setF] = useState({ email: '', amount: 10, note: '' });
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!(await confirm({ title: `Send ${f.amount} ${tokenName}?`, body: `To ${f.email}. Transfers can't be undone.`, confirmLabel: 'Send' }))) return;
        start(async () => {
          const r = await sendTokensAction(f);
          if (r.ok) {
            toast.success(`Sent! Your balance is now ${r.balance}.`);
            setF({ email: '', amount: 10, note: '' });
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      <input className="input" type="email" required placeholder="Their email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="Recipient email" />
      <div className="flex gap-2">
        <input className="input w-28 tabular-nums" type="number" min={1} max={Math.max(1, max)} required value={f.amount} onChange={(e) => setF({ ...f, amount: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="Amount" />
        <input className="input flex-1" maxLength={200} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} aria-label="Note" />
      </div>
      <button className="btn-primary w-full" disabled={pending || max < 1}>
        {pending ? 'Sending…' : max < 1 ? 'Nothing to send' : 'Send'}
      </button>
    </form>
  );
}
