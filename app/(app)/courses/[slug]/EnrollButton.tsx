'use client';

// =============================================================================
// FILE: app/(app)/courses/[slug]/EnrollButton.tsx   (NEW FILE)
// Enrol (free / Premium / pay with tokens) and jump to the first lesson.
// =============================================================================

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConfirm, useToast } from '@/components/feedback';
import { enrollAction } from '../actions';

export default function EnrollButton({
  courseId,
  title,
  reason,
  price,
  balance,
  tokenName,
  tokenIcon,
  premiumName,
  premiumFree,
  canEnroll,
}: {
  courseId: string;
  title: string;
  reason: 'premium' | 'tokens' | null;
  price: number;
  balance: number;
  tokenName: string;
  tokenIcon: string;
  premiumName: string;
  premiumFree: boolean;
  canEnroll: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  if (!canEnroll && reason === 'premium') {
    return (
      <div className="space-y-2">
        <Link href="/premium" className="btn-primary h-11 px-6 w-full justify-center">
          👑 Get {premiumName} to enrol
        </Link>
        <p className="text-xs text-muted text-center">This course is included with {premiumName}.</p>
      </div>
    );
  }

  const short = reason === 'tokens' && balance < price;
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary h-11 px-6 w-full justify-center"
        disabled={pending || short}
        onClick={async () => {
          if (reason === 'tokens' && !(await confirm({ title: `Spend ${price} ${tokenName}?`, body: `You have ${balance}. You'll keep access to “${title}”.`, confirmLabel: 'Enrol' }))) return;
          start(async () => {
            const r = await enrollAction({ courseId }).catch(() => ({ ok: false as const, error: 'Something went wrong — please try again.' }));
            if (!r.ok) {
              toast.error(r.error);
              return;
            }
            toast.success('You’re enrolled — enjoy!');
            router.push(r.firstLesson ? `/courses/${r.slug}/learn/${r.firstLesson}` : `/courses/${r.slug}`);
            router.refresh();
          });
        }}
      >
        {pending ? 'Enrolling…' : reason === 'tokens' ? `Enrol · ${tokenIcon} ${price}` : 'Enrol for free'}
      </button>
      <p className="text-xs text-muted text-center">
        {reason === 'tokens'
          ? `You have ${tokenIcon} ${balance}${short ? ` — earn ${price - balance} more by learning` : ''}. ${premiumName} members enrol free.`
          : premiumFree
            ? `Included with your ${premiumName}.`
            : 'Free for everyone.'}
      </p>
    </div>
  );
}
