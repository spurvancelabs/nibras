// =============================================================================
// FILE: app/(app)/admin/users/[id]/ResetTwoFactor.tsx   (NEW FILE)
// Royal admins: reset someone's two-step sign-in (lost phone).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetTwoFactorAction } from '../actions';
import { Alert } from '@/components/ui';

export default function ResetTwoFactor({ userId, name, enabled }: { userId: string; name: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  return (
    <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="font-semibold">Two-step sign-in</h2>
          <p className="text-sm text-muted">
            {enabled
              ? `${name} signs in with an authenticator code. If they lost their phone and their recovery codes, you can reset it.`
              : `${name} has not turned on two-step sign-in.`}
          </p>
        </div>
        {enabled && (
          <button
            type="button"
            className="btn-outline h-10 px-4 text-danger"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Reset two-step sign-in for ${name}? They will be able to sign in with only their password until they set it up again.`)) return;
              start(async () => {
                const r = await resetTwoFactorAction({ id: userId });
                setMsg(r.ok ? { tone: 'success', text: 'Two-step sign-in was reset.' } : { tone: 'error', text: r.error });
                if (r.ok) router.refresh();
              });
            }}
          >
            {pending ? 'Resetting…' : 'Reset two-step sign-in'}
          </button>
        )}
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </section>
  );
}
