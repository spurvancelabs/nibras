'use client';

// =============================================================================
// FILE: app/register/RegisterForm.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { registerAction } from './actions';

const NEXT_TEXT = {
  signin: { title: 'Your account is ready', text: 'Sign in with your email and password.' },
  'check-email': { title: 'Check your email', text: 'We sent you a link to confirm your address. It works once, for 24 hours. Check your spam folder too.' },
  'wait-approval': { title: 'Almost there', text: 'An admin will review your sign-up. You’ll get an email when your account is approved.' },
} as const;

export default function RegisterForm({ minLength, domains }: { minLength: number; domains: string[] }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', website: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState<keyof typeof NEXT_TEXT | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="space-y-4 text-sm" role="status">
        <p className="text-base font-semibold">{NEXT_TEXT[done].title}</p>
        <p>{NEXT_TEXT[done].text}</p>
        <Link href="/login" className="btn-primary w-full">
          Go to sign in
        </Link>
      </div>
    );
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        start(async () => {
          const r = await registerAction(f);
          if (r.ok) setDone(r.next);
          else setErr(r.error);
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-medium">Full name</span>
        <input className="input mt-1.5 h-12" required maxLength={80} autoComplete="name" autoFocus value={f.name} onChange={set('name')} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input className="input mt-1.5 h-12" type="email" required maxLength={200} autoComplete="email" value={f.email} onChange={set('email')} />
        {domains.length > 0 && <span className="block mt-1 text-xs text-muted">Only addresses ending in {domains.map((d) => `@${d}`).join(', ')}</span>}
      </label>
      <label className="block text-sm">
        <span className="font-medium">Password</span>
        <input className="input mt-1.5 h-12" type="password" required minLength={minLength} maxLength={100} autoComplete="new-password" value={f.password} onChange={set('password')} />
        <span className="block mt-1 text-xs text-muted">At least {minLength} characters.</span>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Type it again</span>
        <input className="input mt-1.5 h-12" type="password" required maxLength={100} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />
      </label>
      {/* Honeypot for bots — hidden from people and screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </label>
      </div>
      {err && (
        <p role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
      <button className="btn-primary w-full h-12" disabled={pending}>
        {pending ? 'Creating your account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
