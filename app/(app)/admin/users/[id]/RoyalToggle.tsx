// =============================================================================
// FILE: app/(app)/admin/users/[id]/RoyalToggle.tsx   (NEW FILE)
// Royal admins can grant / remove royal status on another admin.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setRoyalAction } from '../actions';
import { Alert } from '@/components/ui';

export default function RoyalToggle({
  userId,
  name,
  royal,
  fromEnv,
}: {
  userId: string;
  name: string;
  royal: boolean;
  fromEnv: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  function toggle() {
    const next = !royal;
    const text = next
      ? `Make ${name} a ROYAL ADMIN? They will be able to manage other admins and see all security logs.`
      : `Remove royal admin status from ${name}? They stay an admin.`;
    if (!confirm(text)) return;
    setMsg(null);
    start(async () => {
      const res = await setRoyalAction({ id: userId, royal: next });
      if (res.ok) {
        setMsg({ tone: 'success', text: next ? `${name} is now a royal admin.` : `${name} is no longer a royal admin.` });
        router.refresh();
      } else {
        setMsg({ tone: 'error', text: res.error });
      }
    });
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-primary/40 bg-surface overflow-hidden">
      <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <span aria-hidden>👑</span> Royal admin
          </h2>
          <p className="text-xs text-muted mt-0.5 max-w-lg">
            Royal admins can create and manage other admins, see the audit log and the Security dashboard.
            {fromEnv && ' This admin is royal through the ROYAL_ADMIN_EMAILS setting on the server.'}
          </p>
        </div>
        {!fromEnv && (
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={royal ? 'btn-outline h-10 text-sm shrink-0' : 'btn-primary h-10 text-sm shrink-0'}
          >
            {pending ? 'Saving…' : royal ? 'Remove royal status' : 'Make royal admin'}
          </button>
        )}
      </div>
      {msg && (
        <div className="px-5 sm:px-6 pb-4">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}
    </section>
  );
}
