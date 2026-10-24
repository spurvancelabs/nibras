// =============================================================================
// FILE: app/verify/VerifyShell.tsx   (NEW FILE)
// Simple centred card used by the public verification pages.
// =============================================================================

import Link from 'next/link';

export default function VerifyShell({ orgName, logo, children }: { orgName: string; logo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-text grid place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={orgName} className="brand-logo" />
          ) : (
            <span className="text-lg font-semibold">{orgName}</span>
          )}
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/verify" className="underline">Verify another certificate</Link> · <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
