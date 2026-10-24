// =============================================================================
// FILE: app/(app)/admin/users/AssignMemberIdsPanel.tsx   (NEW FILE)
// "Assign member IDs" — gives every user who doesn't have a member ID the
// next number in the chosen format, oldest accounts first. Shows a preview
// (how many, first → last ID) before anything is saved. Existing IDs are
// never changed.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/constants';
import { formatMemberId, validateMemberIdFormat } from '@/lib/member-id';
import { assignMemberIdsAction, previewAssignMemberIdsAction } from './actions';
import { Alert } from '@/components/ui';

type Props = {
  missingCount: number;
  missingByRole: Record<Role, number>;
  defaultFormat: string;
  required: boolean;
};

type Preview = { count: number; first: string; last: string; sample: { name: string; memberId: string }[] };

export default function AssignMemberIdsPanel({ missingCount, missingByRole, defaultFormat, required }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState(defaultFormat);
  const [scope, setScope] = useState<'' | Role>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [pending, start] = useTransition();

  const fmtError = validateMemberIdFormat(format);
  const scopeCount = scope ? missingByRole[scope] : missingCount;

  function loadPreview(nextFormat = format, nextScope = scope) {
    setMsg(null);
    setPreview(null);
    if (validateMemberIdFormat(nextFormat)) return;
    start(async () => {
      const res = await previewAssignMemberIdsAction({ format: nextFormat, role: nextScope || undefined });
      if (res.ok) setPreview(res);
      else setMsg({ tone: 'error', text: res.error });
    });
  }

  function assign() {
    if (!preview?.count) return;
    if (!confirm(`Assign ${preview.count} member ID${preview.count === 1 ? '' : 's'} (${preview.first} … ${preview.last})?`)) return;
    setMsg(null);
    start(async () => {
      const res = await assignMemberIdsAction({ format, role: scope || undefined });
      if (!res.ok) {
        setMsg({ tone: 'error', text: res.error });
        return;
      }
      setMsg({
        tone: res.failed ? 'info' : 'success',
        text:
          res.assigned > 0
            ? `Assigned ${res.assigned} member ID${res.assigned === 1 ? '' : 's'} (${res.first} … ${res.last}).` +
              (res.failed ? ` ${res.failed} could not be assigned — try again.` : '')
            : 'Nothing to assign — everyone already has a member ID.',
      });
      setPreview(null);
      router.refresh();
    });
  }

  return (
    <section
      className={`rounded-[var(--radius-lg)] border p-4 sm:p-5 ${
        required ? 'border-warning/60 bg-warning/5' : 'border-border bg-surface'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            {missingCount} user{missingCount === 1 ? ' has' : 's have'} no member ID
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Give them the next numbers automatically. Existing member IDs are never changed.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            className="btn-primary h-10 px-4 text-sm shrink-0"
            onClick={() => {
              setOpen(true);
              loadPreview();
            }}
          >
            Assign member IDs
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div>
              <label className="label" htmlFor="amid-format">ID format</label>
              <input
                id="amid-format"
                className="input font-mono uppercase"
                value={format}
                maxLength={40}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/\s+/g, '');
                  setFormat(v);
                  setPreview(null);
                }}
                onBlur={() => loadPreview()}
                aria-invalid={!!fmtError}
              />
              {fmtError ? (
                <p className="text-xs text-danger mt-1">{fmtError}</p>
              ) : (
                <p className="text-xs text-muted mt-1">
                  Looks like <span className="font-mono text-text">{formatMemberId(format, 1)}</span>. Numbering continues
                  after the highest ID already used with this format.
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="amid-scope">Who</label>
              <select
                id="amid-scope"
                className="input"
                value={scope}
                onChange={(e) => {
                  const v = e.target.value as '' | Role;
                  setScope(v);
                  loadPreview(format, v);
                }}
              >
                <option value="">Everyone without an ID ({missingCount})</option>
                <option value="student">Students only ({missingByRole.student})</option>
                <option value="mentor">Mentors only ({missingByRole.mentor})</option>
                <option value="admin">Admins only ({missingByRole.admin})</option>
              </select>
            </div>
          </div>

          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

          <div className="rounded-[var(--radius-md)] border border-border bg-bg p-3 text-sm min-h-[64px]">
            {pending && !preview ? (
              <p className="text-muted">Working…</p>
            ) : preview ? (
              preview.count === 0 ? (
                <p className="text-muted">Nobody in this group is missing a member ID.</p>
              ) : (
                <>
                  <p>
                    <b>{preview.count}</b> user{preview.count === 1 ? '' : 's'} will get{' '}
                    <span className="font-mono">{preview.first}</span>
                    {preview.count > 1 && (
                      <>
                        {' '}… <span className="font-mono">{preview.last}</span>
                      </>
                    )}
                    , oldest accounts first.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted">
                    {preview.sample.map((s) => (
                      <li key={s.memberId}>
                        <span className="font-mono text-text">{s.memberId}</span> → {s.name}
                      </li>
                    ))}
                    {preview.count > preview.sample.length && <li>…</li>}
                  </ul>
                </>
              )
            ) : (
              <p className="text-muted">{fmtError ? 'Fix the format to see a preview.' : `${scopeCount} user(s) in this group.`}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              className="btn-outline h-10"
              onClick={() => {
                setOpen(false);
                setPreview(null);
                setMsg(null);
              }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn-primary h-10 px-5"
              disabled={pending || !!fmtError || !preview?.count}
              onClick={assign}
            >
              {pending ? 'Working…' : preview?.count ? `Assign ${preview.count} ID${preview.count === 1 ? '' : 's'}` : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
