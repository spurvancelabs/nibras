'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="card max-w-lg mx-auto text-center space-y-3 my-10">
      <p className="text-4xl font-bold text-danger">Oops</p>
      <h1 className="text-lg font-semibold">This page hit an error</h1>
      <p className="text-sm text-muted">
        Try again. If it keeps happening, contact your admin.
      </p>
      {error.digest && (
        <p className="text-xs text-muted">Ref: {error.digest}</p>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={reset} className="btn-primary">
          Retry
        </button>
        <Link href="/dashboard" className="btn-outline">
          Dashboard
        </Link>
      </div>
    </div>
  );
}