// =============================================================================
// FILE: app/(app)/error.tsx
// Error boundary for all logged-in pages (shown inside AppShell).
// =============================================================================

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
    <div className="max-w-lg mx-auto my-10 sm:my-16">
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden text-center">
        <div className="bg-hero px-6 pt-10 pb-8">
          <span className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-surface text-danger shadow-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </span>
          <p className="mt-4 text-3xl font-semibold">Oops</p>
        </div>

        <div className="px-6 py-7 space-y-3">
          <h1 className="text-lg font-semibold">This page hit an error</h1>
          <p className="text-sm text-muted">
            Try again. If it keeps happening, contact your admin.
          </p>
          {error.digest && (
            <p className="inline-block px-2.5 py-1 rounded-full bg-bg border border-border text-[11px] text-muted font-mono">
              Ref: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-3">
            <button
              onClick={reset}
              className="h-11 px-6 rounded-[var(--radius-md)] bg-primary text-primary-fg text-sm font-medium hover:opacity-90 transition"
            >
              Retry
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--radius-md)] border border-border bg-surface text-sm font-medium hover:bg-hero transition"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}