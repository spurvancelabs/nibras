// =============================================================================
// FILE: app/(app)/admin/users/audit/page.tsx
// The audit log moved to /admin/security/audit (royal admins only).
// =============================================================================

import { redirect } from 'next/navigation';

export default async function OldAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) qs.set(k, v);
  redirect(`/admin/security/audit${qs.toString() ? `?${qs}` : ''}`);
}
