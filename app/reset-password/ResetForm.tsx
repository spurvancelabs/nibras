'use client';

// =============================================================================
// FILE: app/reset-password/ResetForm.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '../forgot-password/actions';

export default function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="space-y-4 text-sm" role="status">
        <p>Your password was changed. Sign in with your new password.</p>
        <Link href="/login?changed=1" className="btn-primary w-full">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        start(async () => {
          const r = await resetPasswordAction({ token, password, confirm });
          if (r.ok) setDone(true);
          else setErr(r.error);
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-medium">New password</span>
        <input type="password" required autoComplete="new-password" autoFocus className="input mt-1.5 h-12" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Type it again</span>
        <input type="password" required autoComplete="new-password" className="input mt-1.5 h-12" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={100} />
      </label>
      {err && (
        <p role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
      <button className="btn-primary w-full h-12" disabled={pending}>
        {pending ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
