'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import {
  updateUserAction,
  setUserProgramsAction,
} from '../actions';
import type { UserListItem } from '@/lib/users';
import type { ProgramListItem } from '@/lib/programs';
import { ROLES, type Role } from '@/lib/constants';

type Props = {
  user: UserListItem;
  programs: ProgramListItem[];
};

export default function EditUserForm({ user, programs }: Props) {
  const router = useRouter();

  const [account, setAccount] = useState({
    name: user.name,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    password: '',
  });

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
    user.programIds
  );

  const [pendingAccount, startAccount] = useTransition();
  const [pendingPrograms, startPrograms] = useTransition();
  const [accountMsg, setAccountMsg] = useState('');
  const [programsMsg, setProgramsMsg] = useState('');

  const eligiblePrograms = programs;

  function toggleProgram(id: string) {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountMsg('');
    startAccount(async () => {
      const payload: Record<string, unknown> = {
        id: user.id,
        name: account.name,
        role: account.role,
        status: account.status,
        avatar: account.avatar,
      };
      if (account.password) payload.password = account.password;

      const res = await updateUserAction(payload);
      if (res.ok) {
        setAccountMsg('Saved.');
        router.refresh();
      } else {
        setAccountMsg(res.error);
      }
    });
  }

  function savePrograms() {
    setProgramsMsg('');
    startPrograms(async () => {
      const res = await setUserProgramsAction({
        id: user.id,
        programIds: selectedPrograms,
      });
      if (res.ok) {
        setProgramsMsg('Saved.');
        router.refresh();
      } else {
        setProgramsMsg(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveAccount} className="card space-y-4">
        <h2 className="font-semibold">Account</h2>

        {accountMsg && (
          <p className="text-sm text-muted">{accountMsg}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={account.name}
              onChange={(e) => setAccount({ ...account, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user.email} disabled />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={account.role}
              onChange={(e) =>
                setAccount({ ...account, role: e.target.value as Role })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={account.status}
              onChange={(e) =>
                setAccount({
                  ...account,
                  status: e.target.value as 'active' | 'disabled',
                })
              }
            >
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Reset password (leave blank to keep current)</label>
          <input
            className="input"
            type="text"
            value={account.password}
            onChange={(e) => setAccount({ ...account, password: e.target.value })}
            placeholder="min 6 characters"
          />
        </div>

        <div>
          <label className="label">Avatar</label>
          <CloudinaryUpload
            value={account.avatar}
            onChange={(url) => setAccount({ ...account, avatar: url })}
            label="Upload avatar"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={pendingAccount}>
            {pendingAccount ? 'Saving…' : 'Save account'}
          </button>
        </div>
      </form>

      <div className="card space-y-4">
        <h2 className="font-semibold">Programs</h2>
        <p className="text-xs text-muted">
          Select the programs this user is enrolled in.
        </p>

        {programsMsg && <p className="text-sm text-muted">{programsMsg}</p>}

        {eligiblePrograms.length === 0 ? (
          <p className="text-sm text-muted">No programs exist yet.</p>
        ) : (
          <div className="space-y-2">
            {eligiblePrograms.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 border border-border rounded-md cursor-pointer hover:bg-bg"
              >
                <input
                  type="checkbox"
                  checked={selectedPrograms.includes(p.id)}
                  onChange={() => toggleProgram(p.id)}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.status} · {p.mentorCount} mentors · {p.studentCount} students
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={savePrograms}
            className="btn-primary"
            disabled={pendingPrograms || programs.length === 0}
          >
            {pendingPrograms ? 'Saving…' : 'Save programs'}
          </button>
        </div>
      </div>
    </div>
  );
}