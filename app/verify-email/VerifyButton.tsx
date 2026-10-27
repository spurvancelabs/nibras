'use client';

// =============================================================================
// FILE: app/verify-email/VerifyButton.tsx   (NEW FILE)
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { verifyEmailAction } from '../register/actions';

export default function VerifyButton({ token }: { token: string }) {
  const [res, setRes] = useState<Awaited<ReturnType<typeof verifyEmailAction>> | null>(null);
  const [pending, start] = useTransition();
  if (res?.ok) {
    return (
      <div className="space-y-4 text-sm" role="status">
        <p>{res.next === 'signin' ? 'Thanks — your email is confirmed and your account is ready.' : 'Thanks — your email is confirmed. An admin will approve your account soon; you’ll get an email.'}</p>
        <Link href="/login" className="btn-primary w-full">
          Go to sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {res && !res.ok && (
        <p role="alert" className="text-sm text-danger">
          {res.error}
        </p>
      )}
      <button type="button" className="btn-primary w-full h-12" disabled={pending || !token} onClick={() => start(async () => setRes(await verifyEmailAction(token)))}>
        {pending ? 'Confirming…' : 'Confirm my email'}
      </button>
    </div>
  );
}
