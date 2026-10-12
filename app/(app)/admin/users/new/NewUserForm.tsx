'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import { createUserAction } from '../actions';
import { ROLES, type Role } from '@/lib/constants';

export default function NewUserForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as Role,
    avatar: '',
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createUserAction(form);
      if (res.ok) {
        router.push('/admin/users');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="label">Full name</label>
        <input
          className="input"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Temporary password</label>
        <input
          className="input"
          type="text"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="min 6 characters"
        />
      </div>

      <div>
        <label className="label">Avatar (optional)</label>
        <CloudinaryUpload
          value={form.avatar}
          onChange={(url) => setForm({ ...form, avatar: url })}
          label="Upload avatar"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-outline"
          disabled={pending}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}