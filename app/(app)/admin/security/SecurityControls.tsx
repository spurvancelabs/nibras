// =============================================================================
// FILE: app/(app)/admin/security/SecurityControls.tsx   (NEW FILE)
// Client pieces of the Security dashboard: claim first royal admin, claim /
// grant Super Admin, and the emergency "sign out everyone" switch.
// High-impact actions ask the user to confirm their password (useSudo).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimRoyalAction } from '../users/actions';
import { emergencySignOutAction, claimSuperAction, setSuperAction } from './actions';
import { Alert } from '@/components/ui';
import { useConfirm, useSudo, useToast } from '@/components/feedback';

export function ClaimRoyal() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const confirm = useConfirm();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="button"
        className="btn-primary h-10 px-4 text-sm"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: 'Make yourself the first royal admin?',
            body: 'After this, other admins can no longer manage admins or see logs unless you grant them royal status.',
            confirmLabel: 'Make me royal',
          });
          if (!ok) return;
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
  const sudo = useSudo();
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
                const r = await sudo(() => emergencySignOutAction({ confirm: text }));
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

export function ClaimSuper() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const sudo = useSudo();
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn-primary h-10 px-4 text-sm"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: 'Become the Super Admin?',
          body: 'Super Admins control global policies: premium, inactivity automation, AI grading, data retention and delegation. After this, other royal admins lose these powers unless you grant them.',
          confirmLabel: 'Make me Super Admin',
        });
        if (!ok) return;
        start(async () => {
          const r = await sudo(() => claimSuperAction());
          if (r.ok) {
            toast.success('You are now the Super Admin.');
            router.refresh();
          } else if (r.error !== 'Cancelled') toast.error(r.error);
        });
      }}
    >
      {pending ? 'Saving…' : '🛡️ Make me the Super Admin'}
    </button>
  );
}

export function SuperToggle({ id, name, value, fromEnv }: { id: string; name: string; value: boolean; fromEnv: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const sudo = useSudo();
  const toast = useToast();
  if (fromEnv) return <span className="text-[11px] text-muted">super (server)</span>;
  return (
    <button
      type="button"
      className="btn-ghost h-8 px-2.5 text-xs"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: value ? `Remove Super Admin from ${name}?` : `Make ${name} a Super Admin?`,
          body: value ? 'They stay a royal admin.' : 'They will control global policies (premium, automation, AI grading, retention, delegation).',
          tone: value ? 'danger' : 'primary',
          confirmLabel: value ? 'Remove' : 'Make Super Admin',
        });
        if (!ok) return;
        start(async () => {
          const r = await sudo(() => setSuperAction({ id, value: !value }));
          if (r.ok) {
            toast.success(value ? `${name} is no longer a Super Admin.` : `${name} is now a Super Admin.`);
            router.refresh();
          } else if (r.error !== 'Cancelled') toast.error(r.error);
        });
      }}
    >
      {pending ? '…' : value ? 'Remove super' : 'Make super'}
    </button>
  );
}
