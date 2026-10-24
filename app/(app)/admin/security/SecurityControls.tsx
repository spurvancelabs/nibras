// =============================================================================
// FILE: app/(app)/admin/security/SecurityControls.tsx   (NEW FILE)
// Client pieces of the Security dashboard: claim first royal admin, and the
// emergency "sign out everyone" switch.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimRoyalAction } from '../users/actions';
import { emergencySignOutAction } from './actions';
import { Alert } from '@/components/ui';

export function ClaimRoyal() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="button"
        className="btn-primary h-10 px-4 text-sm"
        disabled={pending}
        onClick={() => {
          if (!confirm('Make yourself the first royal admin? After this, other admins can no longer manage admins or see logs unless you grant them royal status.')) return;
          setErr('');
          start(async () => {
            const r = await claimRoyalAction();
            if (r.ok) router.refresh();
            else setErr(r.error);
          });
        }}
      >
        {pending ? 'Saving…' : '👑 Make me the royal admin'}
      </button>
      {err && <span className="text-sm text-danger">{err}</span>}
    </div>
  );
}

export function EmergencySignOut() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  return (
    <div className="space-y-3">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {!open ? (
        <button type="button" className="btn-danger h-10 text-sm" onClick={() => setOpen(true)}>
          Sign out everyone…
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input h-10 sm:max-w-xs"
            placeholder="Type SIGN OUT EVERYONE"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Type SIGN OUT EVERYONE to confirm"
            autoFocus
          />
          <button
            type="button"
            className="btn-danger h-10 text-sm"
            disabled={pending || text.trim().toUpperCase() !== 'SIGN OUT EVERYONE'}
            onClick={() =>
              start(async () => {
                const r = await emergencySignOutAction({ confirm: text });
                if (r.ok) {
                  setMsg({ tone: 'success', text: `Done — ${r.count} account(s) must sign in again. You stay signed in.` });
                  setOpen(false);
                  setText('');
                  router.refresh();
                } else setMsg({ tone: 'error', text: r.error });
              })
            }
          >
            {pending ? 'Working…' : 'Confirm'}
          </button>
          <button type="button" className="btn-outline h-10 text-sm" onClick={() => { setOpen(false); setText(''); }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
