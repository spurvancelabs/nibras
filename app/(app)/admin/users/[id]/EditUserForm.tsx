// =============================================================================
// FILE: app/(app)/admin/users/[id]/EditUserForm.tsx
// Edit user (client): Account (name, member ID + Generate, role, status,
// avatar), Security (reset password + generator), Programs (searchable),
// Danger zone (delete with impact summary + typed confirmation).
// Self-protection: you can't disable/demote/delete your own account.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import {
  updateUserAction,
  setUserProgramsAction,
  deleteUsersAction,
  nextMemberIdAction,
} from '../actions';
import type { UserListItem } from '@/lib/users';
import type { ProgramListItem } from '@/lib/programs';
import { ROLES, type Role } from '@/lib/constants';
import { Panel, Alert, Badge, Icons } from '@/components/ui';

type Footprint = {
  programs: number;
  submissions: number;
  attendance: number;
  queries: number;
  sessionsAsMentor: number;
  notifications: number;
};

type Props = {
  user: UserListItem;
  programs: ProgramListItem[];
  isSelf: boolean;
  footprint: Footprint;
  memberIdRequired: boolean;
  memberIdFormat: string;
};

const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomPassword(len = 10) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SAFE[b % SAFE.length]).join('');
}

type Msg = { tone: 'error' | 'success'; text: string } | null;

export default function EditUserForm({
  user,
  programs,
  isSelf,
  footprint,
  memberIdRequired,
  memberIdFormat,
}: Props) {
  const router = useRouter();

  const [account, setAccount] = useState({
    name: user.name,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    memberId: user.memberId ?? '',
  });
  const [password, setPassword] = useState('');

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(user.programIds);
  const [programSearch, setProgramSearch] = useState('');

  const [pendingAccount, startAccount] = useTransition();
  const [pendingPassword, startPassword] = useTransition();
  const [pendingPrograms, startPrograms] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [genPending, startGen] = useTransition();

  const [accountMsg, setAccountMsg] = useState<Msg>(null);
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
  const [programsMsg, setProgramsMsg] = useState<Msg>(null);
  const [deleteMsg, setDeleteMsg] = useState<Msg>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const programsDirty =
    selectedPrograms.length !== user.programIds.length ||
    selectedPrograms.some((id) => !user.programIds.includes(id));

  const filteredPrograms = useMemo(() => {
    const q = programSearch.toLowerCase();
    return programs.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [programs, programSearch]);

  function toggleProgram(id: string) {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function generateId() {
    setAccountMsg(null);
    startGen(async () => {
      const res = await nextMemberIdAction({ format: memberIdFormat });
      if (res.ok) setAccount((a) => ({ ...a, memberId: res.id }));
      else setAccountMsg({ tone: 'error', text: res.error });
    });
  }

  function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountMsg(null);
    if (memberIdRequired && !account.memberId.trim()) {
      setAccountMsg({ tone: 'error', text: 'Member ID is required.' });
      return;
    }
    startAccount(async () => {
      const res = await updateUserAction({
        id: user.id,
        name: account.name,
        role: account.role,
        status: account.status,
        avatar: account.avatar,
        memberId: account.memberId,
      });
      if (res.ok) {
        setAccountMsg({ tone: 'success', text: 'Account saved.' });
        router.refresh();
      } else {
        setAccountMsg({ tone: 'error', text: res.error });
      }
    });
  }

  function savePassword() {
    setPasswordMsg(null);
    if (password.length < 6) {
      setPasswordMsg({ tone: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    startPassword(async () => {
      const res = await updateUserAction({ id: user.id, password });
      if (res.ok) {
        setPasswordMsg({ tone: 'success', text: 'Password updated. Share it with the user securely.' });
      } else {
        setPasswordMsg({ tone: 'error', text: res.error });
      }
    });
  }

  function savePrograms() {
    setProgramsMsg(null);
    startPrograms(async () => {
      const res = await setUserProgramsAction({
        id: user.id,
        programIds: selectedPrograms,
      });
      if (res.ok) {
        setProgramsMsg({ tone: 'success', text: 'Programs saved.' });
        router.refresh();
      } else {
        setProgramsMsg({ tone: 'error', text: res.error });
      }
    });
  }

  function onDelete() {
    setDeleteMsg(null);
    startDelete(async () => {
      const res = await deleteUsersAction({ ids: [user.id] });
      if (!res.ok) {
        setDeleteMsg({ tone: 'error', text: res.error });
        return;
      }
      if (res.deleted > 0) {
        router.push('/admin/users');
        router.refresh();
      } else {
        setDeleteMsg({ tone: 'error', text: res.blocked[0]?.reason ?? 'User could not be deleted.' });
      }
    });
  }

  const blockedReason = isSelf
    ? "You can't delete your own account."
    : footprint.sessionsAsMentor > 0
    ? `This mentor runs ${footprint.sessionsAsMentor} session${footprint.sessionsAsMentor === 1 ? '' : 's'}. Reassign those sessions first, or disable the account instead.`
    : '';

  return (
    <div className="space-y-6">
      {/* ---------------- Account ---------------- */}
      <form onSubmit={saveAccount}>
        <Panel title="Account" icon={Icons.users} bodyClassName="p-5 sm:p-6 space-y-5">
          {accountMsg && <Alert tone={accountMsg.tone}>{accountMsg.text}</Alert>}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="eu-name">Name</label>
              <input
                id="eu-name"
                className="input"
                required
                value={account.name}
                onChange={(e) => setAccount({ ...account, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="eu-email">Email</label>
              <input id="eu-email" className="input opacity-70" value={user.email} disabled />
            </div>
          </div>

          {/* Member ID */}
          <div>
            <label className="label" htmlFor="eu-mid">
              Member ID{' '}
              {memberIdRequired ? (
                <span className="text-danger">*</span>
              ) : (
                <span className="text-xs font-normal text-muted">(optional)</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                id="eu-mid"
                className="input font-mono uppercase"
                maxLength={40}
                required={memberIdRequired}
                value={account.memberId}
                onChange={(e) => setAccount({ ...account, memberId: e.target.value.toUpperCase() })}
                placeholder={memberIdRequired ? 'Required' : 'Not set'}
              />
              <button
                type="button"
                onClick={generateId}
                disabled={genPending}
                className="btn-outline h-10 shrink-0 text-sm"
                title={`Generate next ID using ${memberIdFormat}`}
              >
                {genPending ? '…' : 'Generate'}
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">
              Format: <span className="font-mono">{memberIdFormat}</span> · change it in Settings → Members.
            </p>
          </div>

          {/* Role */}
          <fieldset>
            <legend className="label">Role</legend>
            <div className="inline-flex p-1 rounded-[var(--radius-md)] bg-bg border border-border">
              {ROLES.map((r) => {
                const active = account.role === r;
                const locked = isSelf && r !== 'admin';
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={locked}
                    onClick={() => setAccount({ ...account, role: r as Role })}
                    aria-pressed={active}
                    className={`h-9 px-4 rounded-[calc(var(--radius-md)-2px)] text-sm font-medium capitalize transition disabled:opacity-40 ${
                      active ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-text'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            {isSelf && <p className="text-[11px] text-muted mt-1">You can&apos;t change your own role.</p>}
          </fieldset>

          {/* Status */}
          <label
            className={`flex items-center justify-between gap-4 p-3.5 rounded-[var(--radius-md)] border border-border bg-bg ${
              isSelf ? 'opacity-60' : 'cursor-pointer'
            }`}
          >
            <span>
              <span className="block text-sm font-medium">Account active</span>
              <span className="block text-xs text-muted">
                Disabled users can&apos;t sign in. Their data is kept.
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                disabled={isSelf}
                checked={account.status === 'active'}
                onChange={(e) =>
                  setAccount({ ...account, status: e.target.checked ? 'active' : 'disabled' })
                }
              />
              <span className="w-11 h-6 rounded-full bg-border peer-checked:bg-success transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

          <div>
            <p className="label">Avatar</p>
            <CloudinaryUpload
              value={account.avatar}
              onChange={(url) => setAccount({ ...account, avatar: url })}
              label="Upload avatar"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" className="btn-primary h-10 px-5" disabled={pendingAccount}>
              {pendingAccount ? 'Saving…' : 'Save account'}
            </button>
          </div>
        </Panel>
      </form>

      {/* ---------------- Security ---------------- */}
      <Panel
        title="Reset password"
        icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        }
        bodyClassName="p-5 sm:p-6 space-y-3"
      >
        {passwordMsg && <Alert tone={passwordMsg.tone}>{passwordMsg.text}</Alert>}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input font-mono"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            autoComplete="new-password"
            aria-label="New password"
          />
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setPassword(randomPassword())} className="btn-outline h-10 text-sm">
              Generate
            </button>
            <button
              type="button"
              onClick={savePassword}
              disabled={pendingPassword || !password}
              className="btn-primary h-10 text-sm px-4"
            >
              {pendingPassword ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">The current password stops working immediately.</p>
      </Panel>

      {/* ---------------- Programs ---------------- */}
      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            Programs
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-fg text-[11px] font-semibold tabular-nums">
              {selectedPrograms.length}
            </span>
          </span>
        }
        icon={Icons.programs}
        bodyClassName="p-5 sm:p-6 space-y-3"
      >
        {programsMsg && <Alert tone={programsMsg.tone}>{programsMsg.text}</Alert>}
        <p className="text-xs text-muted">
          Select the programs this {user.role} belongs to. The program&apos;s member list is updated too.
        </p>

        {programs.length === 0 ? (
          <p className="text-sm text-muted">No programs exist yet.</p>
        ) : (
          <>
            {programs.length > 6 && (
              <input
                className="input"
                placeholder="Search programs…"
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                aria-label="Search programs"
              />
            )}
            <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
              {filteredPrograms.map((p) => {
                const on = selectedPrograms.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition ${
                      on ? 'border-primary bg-hero/60' : 'border-border hover:bg-hero/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleProgram(p.id)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted">
                        {p.status} · {p.mentorCount} mentors · {p.studentCount} students
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted">{programsDirty ? 'Unsaved changes' : ''}</span>
          <div className="flex gap-2">
            {programsDirty && (
              <button type="button" onClick={() => setSelectedPrograms(user.programIds)} className="btn-outline h-10 text-sm">
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={savePrograms}
              className="btn-primary h-10 text-sm px-4"
              disabled={pendingPrograms || programs.length === 0 || !programsDirty}
            >
              {pendingPrograms ? 'Saving…' : 'Save programs'}
            </button>
          </div>
        </div>
      </Panel>

      {/* ---------------- Danger zone ---------------- */}
      <section className="rounded-[var(--radius-lg)] border border-danger/40 bg-surface overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-danger/20 bg-danger/5">
          <h2 className="font-semibold text-danger">Danger zone</h2>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {deleteMsg && <Alert tone={deleteMsg.tone}>{deleteMsg.text}</Alert>}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Delete this user permanently</p>
              <p className="text-xs text-muted max-w-md">
                This removes the account and the data below. It can&apos;t be undone. To keep their history, disable the account instead.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge tone="muted">{footprint.programs} programs</Badge>
                <Badge tone="muted">{footprint.submissions} submissions</Badge>
                <Badge tone="muted">{footprint.attendance} attendance records</Badge>
                <Badge tone="muted">{footprint.queries} query threads</Badge>
                <Badge tone="muted">{footprint.notifications} notifications</Badge>
                {footprint.sessionsAsMentor > 0 && (
                  <Badge tone="warning">{footprint.sessionsAsMentor} sessions as mentor</Badge>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {blockedReason ? (
                <p className="text-xs text-muted max-w-xs">{blockedReason}</p>
              ) : confirmDelete ? (
                <div className="flex flex-col gap-2 md:items-end">
                  <input
                    className="input h-10 w-full md:w-56 text-sm"
                    placeholder="Type DELETE to confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    aria-label="Type DELETE to confirm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete(false);
                        setConfirmText('');
                      }}
                      className="btn-outline h-10 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={pendingDelete || confirmText.trim().toUpperCase() !== 'DELETE'}
                      className="btn-danger h-10 text-sm"
                    >
                      {pendingDelete ? 'Deleting…' : 'Delete permanently'}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger h-10 text-sm">
                  Delete user
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}