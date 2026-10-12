'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import Avatar from '@/components/Avatar';
import { saveProfileAction } from './actions';
import type { UserListItem } from '@/lib/users';

export default function ProfileForm({ user }: { user: UserListItem }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await saveProfileAction({ name, avatar, password });
      if (res.ok) {
        setMsg({ kind: 'ok', text: 'Profile updated.' });
        setPassword('');
        router.refresh();
      } else {
        setMsg({ kind: 'err', text: res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      {msg && (
        <div
          className={`text-sm px-3 py-2 rounded-md border ${
            msg.kind === 'ok'
              ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Avatar name={name || user.name} src={avatar} size={64} />
        <div className="flex-1">
          <label className="label">Avatar</label>
          <CloudinaryUpload
            value={avatar}
            onChange={setAvatar}
            label="Change avatar"
          />
        </div>
      </div>

      <div>
        <label className="label">Name</label>
        <input
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Email</label>
        <input className="input" value={user.email} disabled />
        <p className="text-xs text-muted mt-1">
          Ask your admin to change your email.
        </p>
      </div>

      <div>
        <label className="label">Role</label>
        <input className="input" value={user.role} disabled />
      </div>

      <div>
        <label className="label">New password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current"
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}