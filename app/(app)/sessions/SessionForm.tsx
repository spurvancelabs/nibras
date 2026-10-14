'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSessionAction, deleteSessionAction } from './actions';
import { SESSION_STATUSES } from '@/lib/constants';
import type { SessionListItem } from '@/lib/sessions';

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
    <form onSubmit={onSubmit} className="card space-y-4">
      {error && (
        <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {viewerRole === 'admin' && !initial && (
        <div>
          <label className="label">Mentor</label>
          <select
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
        <label className="label">Program</label>
        <select
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
        <label className="label">Title</label>
        <input
          className="input"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Agenda</label>
        <textarea
          className="input min-h-[120px]"
          value={form.agenda}
          onChange={(e) => setForm({ ...form, agenda: e.target.value })}
          placeholder="What's covered in this session…"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Starts at</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Ends at</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Meeting URL (optional)</label>
        <input
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
        <label className="label">Recording URL (YouTube, optional)</label>
        <input
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

      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as typeof form.status })
          }
        >
          {SESSION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <div>
          {initial && canDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-danger">Delete?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="btn-danger"
                >
                  Yes
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
                className="btn-outline text-danger border-danger"
              >
                Delete
              </button>
            )
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline"
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Create session'}
          </button>
        </div>
      </div>
    </form>
  );
}