'use client';

// =============================================================================
// FILE: app/(app)/sessions/[id]/LockedSession.tsx   (NEW FILE)
// Shown to learners who don't have access to a premium / token session.
// =============================================================================

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from '@/components/feedback';
import NavIcon from '@/components/NavIcon';
import { unlockSessionAction } from '../actions';

export default function LockedSession({
  sessionId,
  reason,
  price,
  tokenName,
  tokenIcon,
  balance,
  premiumName,
}: {
  sessionId: string;
  reason: 'premium' | 'tokens';
  price: number;
  tokenName: string;
  tokenIcon: string;
  balance: number;
  premiumName: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-warning/40 bg-warning/5 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-full bg-warning/15 text-warning shrink-0">
          <NavIcon name="lock" size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">{reason === 'premium' ? `This is a ${premiumName} session` : `Unlock this session for ${price} ${tokenName}`}</h2>
          <p className="text-sm text-muted mt-0.5">
            {reason === 'premium'
              ? `The meeting link, recording and materials are for ${premiumName} members.`
              : `Pay once to get the meeting link, recording and materials. ${premiumName} members get it free.`}
          </p>
        </div>
        {reason === 'tokens' ? (
          <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
            <button
              type="button"
              className="btn-primary h-10 px-5"
              disabled={pending || balance < price}
              onClick={async () => {
                if (!(await confirm({ title: `Spend ${price} ${tokenName}?`, body: `You have ${balance}. This unlocks the session for good.`, confirmLabel: 'Unlock' }))) return;
                start(async () => {
                  const r = await unlockSessionAction({ id: sessionId });
                  if (r.ok) {
                    toast.success('Unlocked — enjoy the session!');
                    router.refresh();
                  } else toast.error(r.error);
                });
              }}
            >
              {pending ? 'Unlocking…' : `Unlock · ${tokenIcon} ${price}`}
            </button>
            <span className="text-xs text-muted">
              You have {tokenIcon} {balance}
              {balance < price ? ' — not enough yet' : ''}
            </span>
          </div>
        ) : (
          <Link href="/premium" className="btn-primary h-10 px-5 shrink-0">
            <NavIcon name="crown" size={16} /> Get {premiumName}
          </Link>
        )}
      </div>
    </section>
  );
}
