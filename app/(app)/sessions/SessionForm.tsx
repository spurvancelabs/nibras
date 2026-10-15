// =============================================================================
// FILE: app/(app)/sessions/SessionForm.tsx
// Create / edit session form (client). Logic unchanged — layout redesigned
// into sections (Details, Schedule, Links, Status).
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSessionAction, deleteSessionAction } from './actions';
import { SESSION_STATUSES } from '@/lib/constants';
import type { SessionListItem } from '@/lib/sessions';
import { Alert, Icons } from '@/components/ui';

type ProgramOption = { id: string; name: string };

type Props = {
  programs: ProgramOption[];
  mentors?: { id: string; name: string }[];
  viewerRole: 'admin' | 'mentor';
  initial?: SessionListItem;
  canDelete?: boolean;
};

function isoToLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

function FormSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4 md:gap-8 py-6 first:pt-0 last:pb-0">
      <div className="flex md:flex-col gap-3 md:gap-2">
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-[var(--radius-md)] bg-hero text-text">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4 min-w-0">{children}</div>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'border-primary bg-primary text-primary-fg',
  completed: 'border-success bg-success text-white',
  cancelled: 'border-danger bg-danger text-white',
};

export default function SessionForm({ programs, mentors, viewerRole, initial, canDelete }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    programId: initial?.programId ?? programs[0]?.id ?? '',
    title: initial?.title ?? '',
    agenda: initial?.agenda ?? '',
    startsAt: isoToLocal(initial?.startsAt),
    endsAt: isoToLocal(initial?.endsAt),
    meetingUrl: initial?.meetingUrl ?? '',
    recordingUrl: initial?.recordingUrl ?? '',
    status: initial?.status ?? 'scheduled',
  });

  const [mentorId, setMentorId] = useState('');

  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    start(async () => {
      const res = await saveSessionAction({
        id: initial?.id,
        programId: form.programId,
        mentorId,
        title: form.title,
        agenda: form.agenda,
        startsAt: localToIso(form.startsAt),
        endsAt: localToIso(form.endsAt),
        meetingUrl: form.meetingUrl,
        recordingUrl: form.recordingUrl,
        status: form.status,
      });
      if (res.ok) {
        router.push(res.id ? `/sessions/${res.id}` : '/sessions');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    start(async () => {
      const res = await deleteSessionAction({ id: initial.id });
      if (res.ok) {
        router.push('/sessions');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden"
    >
      <div className="p-5 sm:p-7 space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="divide-y divide-border">
          {/* Details */}
          <FormSection icon={Icons.programs} title="Details" hint="Who it's for and what it covers.">
            {viewerRole === 'admin' && !initial && (
              <div>
                <label className="label" htmlFor="sf-mentor">Mentor</label>
                <select
                  id="sf-mentor"
                  className="input"
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a mentor…</option>
                  {(mentors ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">
                  Only mentors of the selected program appear here.
                </p>
              </div>
            )}

            <div>
              <label className="label" htmlFor="sf-program">Program</label>
              <select
                id="sf-program"
                className="input"
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
                required
              >
                <option value="" disabled>Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="sf-title">Title</label>
              <input
                id="sf-title"
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Week 3 — Network basics"
              />
            </div>

            <div>
              <label className="label" htmlFor="sf-agenda">Agenda</label>
              <textarea
                id="sf-agenda"
                className="input min-h-[120px]"
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                placeholder="What's covered in this session…"
              />
            </div>
          </FormSection>

          {/* Schedule */}
          <FormSection icon={Icons.clock} title="Schedule" hint="Shown in each viewer's local time.">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="sf-start">Starts at</label>
                <input
                  id="sf-start"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="sf-end">Ends at</label>
                <input
                  id="sf-end"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
          </FormSection>

          {/* Links */}
          <FormSection icon={Icons.link} title="Links" hint="Both are optional.">
            <div>
              <label className="label" htmlFor="sf-meet">Meeting URL</label>
              <input
                id="sf-meet"
                className="input"
                type="url"
                inputMode="url"
                pattern="https?://.+"
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                placeholder="https://meet.google.com/…"
              />
              <p className="text-xs text-muted mt-1">
                Must start with http:// or https://
              </p>
            </div>

            <div>
              <label className="label" htmlFor="sf-rec">Recording URL (YouTube)</label>
              <input
                id="sf-rec"
                className="input"
                type="url"
                inputMode="url"
                pattern="https?://.+"
                value={form.recordingUrl}
                onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
                placeholder="https://youtu.be/…"
              />
              <p className="text-xs text-muted mt-1">
                Upload the video to YouTube as Unlisted, then paste the link here.
              </p>
            </div>
          </FormSection>

          {/* Status */}
          <FormSection icon={Icons.check} title="Status">
            <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-2">
              {SESSION_STATUSES.map((s) => {
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, status: s as typeof form.status })}
                    className={`h-10 px-4 rounded-[var(--radius-md)] border text-sm font-medium capitalize transition ${
                      active
                        ? STATUS_STYLE[s] ?? 'border-primary bg-primary text-primary-fg'
                        : 'border-border bg-surface text-muted hover:text-text hover:bg-hero'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </FormSection>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-7 py-4 border-t border-border bg-bg">
        <div>
          {initial && canDelete && (
            confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-danger font-medium">Delete this session?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="btn-danger"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost text-danger"
              >
                Delete session
              </button>
            )
          )}
        </div>

        <div className="flex gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline flex-1 sm:flex-none h-11"
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none h-11 px-6" disabled={pending}>
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create session'}
          </button>
        </div>
      </div>
    </form>
  );
}