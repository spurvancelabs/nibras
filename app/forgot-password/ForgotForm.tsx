'use client';

// =============================================================================
// FILE: app/forgot-password/ForgotForm.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { requestResetAction } from './actions';

export default function ForgotForm({ emailOn, contact }: { emailOn: boolean; contact: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (!emailOn) {
    return (
      <div className="space-y-4 text-sm">
        <p>Password reset by email isn&apos;t set up for this site yet. Please ask your admin to reset it for you{contact ? <> — <a className="underline" href={`mailto:${contact}`}>{contact}</a></> : ''}.</p>
        <Link href="/login" className="btn-outline w-full">
          Back to sign in
        </Link>
      </div>
    );
  }
  if (sent) {
    return (
      <div className="space-y-4 text-sm" role="status">
        <p>
          If <b>{email}</b> has an account, a reset link is on its way. It works once, for 30 minutes. Check your spam folder too.
        </p>
        <Link href="/login" className="btn-outline w-full">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await requestResetAction({ email });
          setSent(true);
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input type="email" required autoComplete="email" autoFocus className="input mt-1.5 h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="btn-primary w-full h-12" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="underline text-muted hover:text-text">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
