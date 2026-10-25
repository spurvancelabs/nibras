// =============================================================================
// FILE: app/(app)/profile/PasswordForm.tsx   (NEW FILE)
// Change password with a strength meter. Success signs you out everywhere
// (including here) and the login page explains why.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { SettingsCard, Field } from '@/components/settings-ui';
import { Alert } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { changePasswordAction } from './actions';

function strength(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s);
  return { score, label: ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'][score] };
}

export default function PasswordForm({ minLength, lastChanged }: { minLength: number; lastChanged: string | null }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const st = useMemo(() => strength(next), [next]);
  const mismatch = confirm !== '' && next !== confirm;
  const tooShort = next !== '' && next.length < minLength;

  return (
    <SettingsCard
      title="Password"
      description={
        <>
          At least {minLength} characters. Changing it signs you out on every device.
          {lastChanged && <> Last changed {lastChanged}.</>}
        </>
      }
      icon={<NavIcon name="shield" />}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          if (next !== confirm) return setMsg({ tone: 'error', text: 'The new passwords don’t match.' });
          start(async () => {
            const r = await changePasswordAction({ currentPassword: current, newPassword: next });
            if (r.ok) {
              setMsg({ tone: 'success', text: 'Password changed. Signing you out…' });
              await signOut({ callbackUrl: '/login?changed=1' });
            } else setMsg({ tone: 'error', text: r.error });
          });
        }}
      >
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label="Current password" htmlFor="pw-cur">
          <input id="pw-cur" type={show ? 'text' : 'password'} className="input h-11" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="New password" htmlFor="pw-new" error={tooShort ? `Use at least ${minLength} characters.` : null}>
            <input id="pw-new" type={show ? 'text' : 'password'} className="input h-11" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-conf" error={mismatch ? 'Passwords don’t match.' : null}>
            <input id="pw-conf" type={show ? 'text' : 'password'} className="input h-11" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        {next && (
          <div className="flex items-center gap-3">
            <div className="flex-1 grid grid-cols-4 gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full ${i < st.score ? (st.score <= 1 ? 'bg-danger' : st.score === 2 ? 'bg-warning' : 'bg-success') : 'bg-border'}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted w-24 text-right">{st.label}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show passwords
          </label>
          <button type="submit" className="btn-primary h-11 px-5" disabled={pending || !current || !next || mismatch || tooShort}>
            {pending ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
