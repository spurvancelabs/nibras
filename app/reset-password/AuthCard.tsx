// =============================================================================
// FILE: app/reset-password/AuthCard.tsx   (NEW FILE)
// Simple centered card used by the forgot / reset password pages.
// =============================================================================

export default function AuthCard({ orgName, title, subtitle, children }: { orgName: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-[var(--radius-xl)] shadow-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{orgName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
