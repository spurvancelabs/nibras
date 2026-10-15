// =============================================================================
// FILE: app/(app)/admin/users/new/NewUserForm.tsx
// Create-user form (client).
// NEW: role cards, member ID (+ Generate, + required switch & format),
//      password generator / show / copy, optional welcome email,
//      success screen with "Add another" / "Open user".
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import { createUserAction, nextMemberIdAction } from '../actions';
import { ROLES, type Role } from '@/lib/constants';
import MemberIdControls from '../MemberIdControls';
import { Alert, Icons } from '@/components/ui';

type Props = {
  memberIdRequired: boolean;
  memberIdFormat: string;
};

const ROLE_INFO: Record<Role, { label: string; hint: string }> = {
  student: { label: 'Student', hint: 'Joins sessions, submits work' },
  mentor: { label: 'Mentor', hint: 'Runs sessions, grades work' },
  admin: { label: 'Admin', hint: 'Full access to everything' },
};

const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomPassword(len = 10) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SAFE[b % SAFE.length]).join('');
}

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'student' as Role,
  avatar: '',
  memberId: '',
};

export default function NewUserForm({ memberIdRequired, memberIdFormat }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [sendEmail, setSendEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(true);
  const [required, setRequired] = useState(memberIdRequired);
  const [format, setFormat] = useState(memberIdFormat);
  const [showIdSettings, setShowIdSettings] = useState(false);

  const [pending, startTransition] = useTransition();
  const [genPending, startGen] = useTransition();
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ id: string; name: string; email: string; password: string; memberId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function generateId() {
    setError('');
    startGen(async () => {
      const res = await nextMemberIdAction({ format });
      if (res.ok) setForm((f) => ({ ...f, memberId: res.id }));
      else setError(res.error);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (required && !form.memberId.trim()) {
      setError('Member ID is required — type one or click Generate.');
      return;
    }
    startTransition(async () => {
      const res = await createUserAction({ ...form, sendEmail });
      if (res.ok) {
        setCreated({
          id: res.id ?? '',
          name: form.name,
          email: form.email,
          password: form.password,
          memberId: form.memberId.trim().toUpperCase(),
        });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  async function copyCredentials() {
    if (!created) return;
    const text =
      `Name: ${created.name}\nEmail: ${created.email}\n` +
      (created.memberId ? `Member ID: ${created.memberId}\n` : '') +
      `Password: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  // -------------------------------------------------------------------------
  // Success screen
  // -------------------------------------------------------------------------
  if (created) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="bg-hero px-6 py-8 text-center">
          <span className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-success text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h2 className="mt-4 text-xl font-semibold">{created.name} was added</h2>
          <p className="text-sm text-muted mt-1">
            {sendEmail ? 'A welcome email with these details is on its way.' : 'Share these details with the user.'}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            <Cred label="Email" value={created.email} />
            <Cred label="Member ID" value={created.memberId || '—'} mono />
            <Cred label="Password" value={created.password} mono />
          </dl>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button type="button" onClick={copyCredentials} className="btn-outline h-10">
              {copied ? 'Copied ✓' : 'Copy details'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setForm({ ...EMPTY, role: form.role });
              }}
              className="btn-outline h-10"
            >
              Add another
            </button>
            {created.id && (
              <Link href={`/admin/users/${created.id}`} className="btn-primary h-10 inline-flex items-center justify-center">
                Open user
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------
  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden"
    >
      <div className="p-5 sm:p-7 space-y-6">
        {error && <Alert>{error}</Alert>}

        {/* Role */}
        <fieldset>
          <legend className="label">Role</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => {
              const active = form.role === r;
              return (
                <label
                  key={r}
                  className={`flex flex-col gap-0.5 p-3 rounded-[var(--radius-md)] border cursor-pointer transition ${
                    active ? 'border-primary bg-hero ring-1 ring-primary' : 'border-border hover:bg-hero/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={active}
                    onChange={() => setForm({ ...form, role: r })}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{ROLE_INFO[r].label}</span>
                  <span className="hidden sm:block text-[11px] text-muted leading-snug">{ROLE_INFO[r].hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="nu-name">Full name</label>
            <input
              id="nu-name"
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ayesha Khan"
            />
          </div>
          <div>
            <label className="label" htmlFor="nu-email">Email</label>
            <input
              id="nu-email"
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
        </div>

        {/* Member ID */}
        <div className="rounded-[var(--radius-md)] border border-border bg-bg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="label mb-0" htmlFor="nu-mid">
              Member ID{' '}
              {required ? (
                <span className="text-danger">*</span>
              ) : (
                <span className="text-xs font-normal text-muted">(optional)</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowIdSettings((v) => !v)}
              aria-expanded={showIdSettings}
              className="btn-ghost h-8 text-xs"
            >
              {Icons.edit}
              ID settings
            </button>
          </div>
          <div className="flex gap-2">
            <input
              id="nu-mid"
              className="input font-mono uppercase"
              required={required}
              maxLength={40}
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value.toUpperCase() })}
              placeholder={required ? 'Required' : 'Leave empty if not needed'}
            />
            <button
              type="button"
              onClick={generateId}
              disabled={genPending}
              className="btn-outline h-10 shrink-0 text-sm"
              title={`Generate next ID using ${format}`}
            >
              {genPending ? '…' : 'Generate'}
            </button>
          </div>
          {showIdSettings && (
            <div className="pt-3 border-t border-border">
              <MemberIdControls
                required={required}
                format={format}
                onRequiredChange={setRequired}
                onFormatChange={setFormat}
              />
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="label" htmlFor="nu-pass">Temporary password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="nu-pass"
                className="input font-mono pr-11"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded text-muted hover:text-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, password: randomPassword() });
                setShowPassword(true);
              }}
              className="btn-outline h-10 shrink-0 text-sm"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div>
          <p className="label">Avatar (optional)</p>
          <CloudinaryUpload
            value={form.avatar}
            onChange={(url) => setForm({ ...form, avatar: url })}
            label="Upload avatar"
          />
        </div>

        {/* Email */}
        <label className="flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] border border-border cursor-pointer hover:bg-hero/40">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-medium">Email the login details to the user</span>
            <span className="block text-xs text-muted">Includes their email, member ID and temporary password.</span>
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 sm:px-7 py-4 border-t border-border bg-bg">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-outline h-11"
          disabled={pending}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary h-11 px-6" disabled={pending}>
          {pending ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}

function Cred({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg px-3.5 py-2.5 min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}