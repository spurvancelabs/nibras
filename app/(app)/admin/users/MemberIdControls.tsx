// =============================================================================
// FILE: app/(app)/admin/users/MemberIdControls.tsx   (NEW FILE)
// Shared member-ID rules panel used on New user + Import pages:
//   - "Require member ID" switch (saved to Settings immediately)
//   - default ID format with live preview + "Save as default"
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { saveMemberIdRulesAction } from './actions';
import { formatMemberId, validateMemberIdFormat } from '@/lib/member-id';

type Props = {
  required: boolean;
  format: string;
  onRequiredChange?: (v: boolean) => void;
  onFormatChange?: (v: string) => void;
  /** Hide the "Save as default" button (e.g. when the format is only used once). */
  hideSaveFormat?: boolean;
};

export default function MemberIdControls({
  required,
  format,
  onRequiredChange,
  onFormatChange,
  hideSaveFormat = false,
}: Props) {
  const [req, setReq] = useState(required);
  const [fmt, setFmt] = useState(format);
  const [savedFmt, setSavedFmt] = useState(format);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fmtError = validateMemberIdFormat(fmt);

  function toggleRequired(next: boolean) {
    setReq(next);
    onRequiredChange?.(next);
    setMsg(null);
    start(async () => {
      const res = await saveMemberIdRulesAction({ memberIdRequired: next });
      if (!res.ok) {
        setReq(!next);
        onRequiredChange?.(!next);
        setMsg({ ok: false, text: res.error });
      } else {
        setMsg({ ok: true, text: next ? 'Member ID is now required.' : 'Member ID is now optional.' });
      }
    });
  }

  function saveFormat() {
    if (fmtError) return;
    setMsg(null);
    start(async () => {
      const res = await saveMemberIdRulesAction({ memberIdFormat: fmt });
      if (res.ok) {
        setSavedFmt(fmt.toUpperCase());
        setMsg({ ok: true, text: 'Default format saved.' });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Required switch */}
      <label className="flex items-center justify-between gap-4 p-3.5 rounded-[var(--radius-md)] border border-border bg-surface cursor-pointer">
        <span>
          <span className="block text-sm font-medium">Require member ID</span>
          <span className="block text-xs text-muted">
            {req ? 'Every user must have a member ID.' : 'Member ID is optional.'} Applies everywhere.
          </span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={req}
            disabled={pending}
            onChange={(e) => toggleRequired(e.target.checked)}
          />
          <span className="w-11 h-6 rounded-full bg-border peer-checked:bg-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
          <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      {/* Format */}
      <div>
        <label className="label" htmlFor="mid-format">ID format</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="mid-format"
            className="input font-mono uppercase"
            value={fmt}
            maxLength={40}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().replace(/\s+/g, '');
              setFmt(v);
              onFormatChange?.(v);
            }}
            placeholder="MEM-{YYYY}-{####}"
            aria-invalid={!!fmtError}
          />
          {!hideSaveFormat && fmt.toUpperCase() !== savedFmt.toUpperCase() && (
            <button
              type="button"
              onClick={saveFormat}
              disabled={pending || !!fmtError}
              className="btn-outline h-10 shrink-0 text-sm"
            >
              Save as default
            </button>
          )}
        </div>
        {fmtError ? (
          <p className="text-xs text-danger mt-1">{fmtError}</p>
        ) : (
          <p className="text-xs text-muted mt-1">
            Next IDs look like{' '}
            <span className="font-mono text-text">{formatMemberId(fmt, 1)}</span>,{' '}
            <span className="font-mono text-text">{formatMemberId(fmt, 2)}</span>, …
          </p>
        )}
        <p className="text-[11px] text-muted mt-1.5">
          Tokens: <code>{'{YYYY}'}</code> <code>{'{YY}'}</code> <code>{'{MM}'}</code> <code>{'{DD}'}</code> and{' '}
          <code>{'{###}'}</code> for the running number (number of # = digits).
        </p>
      </div>

      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-success' : 'text-danger'}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}