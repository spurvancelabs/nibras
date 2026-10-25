// =============================================================================
// FILE: app/(app)/profile/AccountForm.tsx   (NEW FILE)
// Name and profile photo.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import Avatar from '@/components/Avatar';
import { SettingsCard, Field } from '@/components/settings-ui';
import { Alert } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { saveAccountAction } from './actions';

export default function AccountForm({ user }: { user: { name: string; avatar: string; email: string; role: string; memberId: string } }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const dirty = name !== user.name || avatar !== user.avatar;

  return (
    <SettingsCard title="Your details" description="How you appear to mentors, students and on certificates." icon={<NavIcon name="user" />}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await saveAccountAction({ name, avatar });
            setMsg(r.ok ? { tone: 'success', text: 'Profile updated.' } : { tone: 'error', text: r.error });
            if (r.ok) router.refresh();
          });
        }}
      >
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={name || user.name} src={avatar} size={72} />
          <div className="flex-1 min-w-0">
            <Field label="Profile photo">
              <CloudinaryUpload value={avatar} onChange={setAvatar} label="Upload a photo" />
            </Field>
          </div>
        </div>
        <Field label="Full name" htmlFor="pf-name">
          <input id="pf-name" className="input h-11" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Email" hint="Ask your admin to change it.">
            <input className="input h-11" value={user.email} disabled />
          </Field>
          <Field label="Role">
            <input className="input h-11 capitalize" value={user.role} disabled />
          </Field>
          <Field label="Member ID">
            <input className="input h-11 font-mono" value={user.memberId || '—'} disabled />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary h-11 px-5" disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
