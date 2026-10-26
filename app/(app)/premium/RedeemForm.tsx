'use client';

// =============================================================================
// FILE: app/(app)/premium/RedeemForm.tsx   (NEW FILE)
// "Have a code?" form on the Premium page.
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemCodeAction } from './actions';
import { useToast } from '@/components/feedback';

export default function RedeemForm() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        start(async () => {
          const r = await redeemCodeAction({ code });
          if (r.ok) {
            setCode('');
            toast.success('Code accepted — Premium is active. Enjoy!');
            router.refresh();
          } else setErr(r.error);
        });
      }}
    >
      <label className="sr-only" htmlFor="premium-code">
        Premium code
      </label>
      <input
        id="premium-code"
        className="input flex-1 font-mono uppercase tracking-wider"
        placeholder="NIB-XXXX-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        maxLength={40}
        aria-invalid={!!err}
        aria-describedby={err ? 'premium-code-err' : undefined}
      />
      <button className="btn-primary" disabled={pending || code.trim().length < 4}>
        {pending ? 'Checking…' : 'Redeem'}
      </button>
      {err && (
        <p id="premium-code-err" role="alert" className="sm:basis-full text-sm text-danger">
          {err}
        </p>
      )}
    </form>
  );
}
