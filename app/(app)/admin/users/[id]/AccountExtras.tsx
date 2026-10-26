'use client';

// =============================================================================
// FILE: app/(app)/admin/users/[id]/AccountExtras.tsx   (NEW FILE)
// On a user's admin page: why the account is paused (if it is), the
// inactivity-automation exemption switch, and Premium status.
// =============================================================================

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toggle } from '@/components/settings-ui';
import { useToast } from '@/components/feedback';
import { isLifetime, isPremiumActive } from '@/lib/entitlements';
import { formatDate, formatDateTime } from '@/lib/time';
import { setExemptAction } from '../../automation/actions';

export default function AccountExtras({
  userId,
  role,
  status,
  exempt,
  suspendedReason,
  suspendedBy,
  suspendedAt,
  premiumUntil,
  premiumOn,
  canReview,
}: {
  userId: string;
  role: string;
  status: string;
  exempt: boolean;
  suspendedReason: string;
  suspendedBy: string;
  suspendedAt: string | null;
  premiumUntil: string | null;
  premiumOn: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  if (role === 'admin') return null;
  const active = isPremiumActive(premiumUntil);
  return (
    <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-4">
      <h2 className="font-semibold">Account status</h2>
      {status === 'disabled' && (
        <div className="p-3 rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 text-sm">
          <b>Paused {suspendedBy === 'automation' ? 'by inactivity automation' : suspendedBy === 'admin' ? 'by an admin' : ''}</b>
          {suspendedAt && <span className="text-muted"> · {formatDateTime(suspendedAt)}</span>}
          {suspendedReason && <p className="mt-1 text-muted">{suspendedReason}</p>}
          <p className="mt-1 text-xs text-muted">Set the status back to Active above to reactivate — nothing was deleted.</p>
        </div>
      )}
      <Toggle
        checked={exempt}
        disabled={!canReview || pending}
        onChange={(v) =>
          start(async () => {
            const r = await setExemptAction({ userId, exempt: v });
            if (r.ok) {
              toast.success(v ? 'Exempt from inactivity automation.' : 'Exemption removed.');
              router.refresh();
            } else toast.error(r.error);
          })
        }
        label="Exempt from inactivity automation"
        description="Never reminded, flagged or paused for inactivity (e.g. on approved leave)."
      />
      {premiumOn && (
        <p className="text-sm">
          Premium:{' '}
          {active ? <b>{isLifetime(premiumUntil) ? 'lifetime' : `until ${formatDate(premiumUntil!)}`}</b> : <span className="text-muted">free plan</span>} ·{' '}
          <Link href="/admin/premium?filter=all" className="underline text-muted">
            manage
          </Link>
        </p>
      )}
    </section>
  );
}
