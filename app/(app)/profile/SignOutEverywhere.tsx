'use client';

// =============================================================================
// FILE: app/(app)/profile/SignOutEverywhere.tsx   (NEW FILE)
// Profile → Security: sign out of every device (lost phone, shared computer).
// =============================================================================

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { SettingsCard } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import { useConfirm, useToast } from '@/components/feedback';
import { signOutEverywhereAction } from './actions';

export default function SignOutEverywhere() {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <SettingsCard
      title="Sign out of all devices"
      description="Left your account open on a shared or lost device? This signs you out everywhere, including here."
      icon={<NavIcon name="logout" />}
    >
      <button
        type="button"
        className="btn-outline h-10 px-4 text-sm text-danger"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({ title: 'Sign out everywhere?', body: 'Every device, including this one, will need to sign in again.', confirmLabel: 'Sign out everywhere', tone: 'danger' });
          if (!ok) return;
          start(async () => {
            const r = await signOutEverywhereAction();
            if (r.ok) await signOut({ callbackUrl: '/login' });
            else toast.error(r.error);
          });
        }}
      >
        {pending ? 'Signing out…' : 'Sign out of all devices'}
      </button>
    </SettingsCard>
  );
}
