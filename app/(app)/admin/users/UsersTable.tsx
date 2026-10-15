// =============================================================================
// FILE: app/(app)/admin/users/UsersTable.tsx   (NEW FILE)
// Users table (client): row selection, bulk actions (activate / disable /
// change role / delete with confirmation) and CSV export.
// Table on md+, cards on phones.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { ROLES, type Role } from '@/lib/constants';
import { bulkUpdateUsersAction, deleteUsersAction } from './actions';
import { Badge, Alert, EmptyNote, Icons } from '@/components/ui';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  avatar: string;
  programIds: string[];
  programNames: string[];
  createdAt: string;
  memberId: string;
};

const ROLE_TONE: Record<Role, 'primary' | 'warning' | 'muted'> = {
  admin: 'primary',
  mentor: 'warning',
  student: 'muted',
};

function csvField(s: string) {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UsersTable({
  rows,
  currentUserId,
}: {
  rows: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: React.ReactNode } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [roleTo, setRoleTo] = useState<Role | ''>('');

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const allSelected = rows.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirmDelete(false);
    setConfirmText('');
    setRoleTo('');
  }

  function bulk(patch: { status?: 'active' | 'disabled'; role?: Role }) {
    setMsg(null);
    start(async () => {
      const res = await bulkUpdateUsersAction({ ids: Array.from(selected), ...patch });
      if (res.ok) {
        setMsg({
          tone: 'success',
          text: `Updated ${res.updated} user${res.updated === 1 ? '' : 's'}.${res.skippedSelf ? ' Your own account was skipped.' : ''}`,
        });
        clearSelection();
        router.refresh();
      } else {
        setMsg({ tone: 'error', text: res.error });
      }
    });
  }

  function doDelete() {
    setMsg(null);
    start(async () => {
      const res = await deleteUsersAction({ ids: Array.from(selected) });
      if (res.ok) {
        setMsg({
          tone: res.blocked.length ? 'info' : 'success',
          text: (
            <>
              Deleted {res.deleted} user{res.deleted === 1 ? '' : 's'}.
              {res.blocked.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {res.blocked.map((b) => (
                    <li key={b.id}>
                      <b>{b.name}</b> not deleted — {b.reason}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        });
        clearSelection();
        router.refresh();
      } else {
        setMsg({ tone: 'error', text: res.error });
      }
    });
  }

  function exportCsv() {
    const list = selectedRows.length ? selectedRows : rows;
    const header = 'name,email,member_id,role,status,programs,created';
    const body = list
      .map((u) =>
        [u.name, u.email, u.memberId, u.role, u.status, u.programNames.join('; '), fmtDate(u.createdAt)]
          .map(csvField)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-lg)]">
        <EmptyNote
          icon={Icons.users}
          title="No users found."
          text="Try a different search or filter."
          action={
            <Link href="/admin/users/new" className="btn-primary text-sm">
              Add user
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {/* Bulk bar */}
      <div
        className={`sticky top-[4.5rem] z-20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 rounded-[var(--radius-lg)] border transition ${
          selected.size ? 'bg-primary text-primary-fg border-primary shadow-lg' : 'bg-surface border-border'
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all visible users"
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <p className="text-sm font-medium">
            {selected.size ? `${selected.size} selected` : `${rows.length} user${rows.length === 1 ? '' : 's'}`}
          </p>
          {selected.size > 0 && (
            <button type="button" onClick={clearSelection} className="text-xs underline opacity-80 hover:opacity-100">
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && !confirmDelete && (
            <>
              <BulkButton onClick={() => bulk({ status: 'active' })} disabled={pending}>Activate</BulkButton>
              <BulkButton onClick={() => bulk({ status: 'disabled' })} disabled={pending}>Disable</BulkButton>
              <div className="flex items-center gap-1">
                <select
                  value={roleTo}
                  onChange={(e) => setRoleTo(e.target.value as Role | '')}
                  aria-label="Change role to"
                  className="h-9 px-2 rounded-[var(--radius-md)] bg-primary-fg/10 border border-primary-fg/25 text-sm text-primary-fg [&>option]:text-text"
                >
                  <option value="">Change role…</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {roleTo && (
                  <BulkButton onClick={() => bulk({ role: roleTo })} disabled={pending}>Apply</BulkButton>
                )}
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-3 rounded-[var(--radius-md)] bg-danger text-white text-sm font-medium hover:opacity-90"
              >
                Delete
              </button>
            </>
          )}

          {confirmDelete && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Type <b>DELETE</b> to remove {selected.size} user{selected.size === 1 ? '' : 's'}:</span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="h-9 w-28 px-2 rounded-[var(--radius-md)] bg-surface text-text border border-border text-sm"
                aria-label="Type DELETE to confirm"
                autoFocus
              />
              <button
                type="button"
                onClick={doDelete}
                disabled={pending || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="h-9 px-3 rounded-[var(--radius-md)] bg-danger text-white text-sm font-medium disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
              <BulkButton onClick={() => { setConfirmDelete(false); setConfirmText(''); }}>Cancel</BulkButton>
            </div>
          )}

          <button
            type="button"
            onClick={exportCsv}
            className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] text-sm font-medium border transition ${
              selected.size
                ? 'border-primary-fg/30 hover:bg-primary-fg/10'
                : 'border-border bg-surface hover:bg-hero'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export {selected.size ? 'selected' : 'CSV'}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <p className="text-xs text-muted px-1">
          Deleting removes the users from all programs and deletes their submissions, attendance,
          query threads and notifications. Mentors who still run sessions and your own account are skipped.
        </p>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Member ID</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Programs</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => {
                const on = selected.has(u.id);
                const self = u.id === currentUserId;
                return (
                  <tr key={u.id} className={`transition ${on ? 'bg-hero/60' : 'hover:bg-hero/30'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(u.id)}
                        aria-label={`Select ${u.name}`}
                        className="w-4 h-4 accent-[var(--color-primary)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 min-w-0 group">
                        <Avatar name={u.name} src={u.avatar} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:underline">
                            {u.name}
                            {self && <span className="ml-1.5 text-[10px] font-semibold text-muted">(you)</span>}
                          </p>
                          <p className="text-xs text-muted truncate">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {u.memberId ? (
                        <span className="font-mono text-xs px-2 py-1 rounded bg-bg border border-border">{u.memberId}</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      {u.programNames.length === 0 ? (
                        <span className="text-xs text-muted">None</span>
                      ) : (
                        <span className="text-xs text-muted line-clamp-2" title={u.programNames.join(', ')}>
                          {u.programNames.slice(0, 2).join(', ')}
                          {u.programNames.length > 2 && ` +${u.programNames.length - 2}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.status === 'active' ? (
                        <Badge tone="success" dot>active</Badge>
                      ) : (
                        <Badge tone="danger" dot>disabled</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/users/${u.id}`} className="btn-ghost h-8 text-xs">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden space-y-2">
        {rows.map((u) => {
          const on = selected.has(u.id);
          return (
            <li
              key={u.id}
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border transition ${
                on ? 'border-primary bg-hero/60' : 'border-border bg-surface'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(u.id)}
                aria-label={`Select ${u.name}`}
                className="mt-2.5 w-4 h-4 accent-[var(--color-primary)]"
              />
              <Link href={`/admin/users/${u.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} src={u.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  {u.status === 'active' ? (
                    <Badge tone="success" dot>active</Badge>
                  ) : (
                    <Badge tone="danger" dot>disabled</Badge>
                  )}
                  {u.memberId && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg border border-border">{u.memberId}</span>
                  )}
                  {u.programNames.length > 0 && (
                    <span className="text-[11px] text-muted">{u.programNames.length} program{u.programNames.length === 1 ? '' : 's'}</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BulkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 px-3 rounded-[var(--radius-md)] border border-primary-fg/30 text-sm font-medium hover:bg-primary-fg/10 disabled:opacity-50 transition"
    >
      {children}
    </button>
  );
}