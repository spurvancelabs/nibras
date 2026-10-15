// =============================================================================
// FILE: app/(app)/admin/users/import/ImportForm.tsx
// CSV import wizard (client): 1 Upload → 2 Review → 3 Done.
// NEW: drag & drop, step indicator, optional `memberId` column,
//      "Require member ID" switch, member-ID format prompt that auto-generates
//      IDs for rows without one, row filters, download of error rows,
//      member IDs in the credentials export.
// =============================================================================

'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { validateImportAction, commitImportAction } from './actions';
import type { ImportRowValidation, ImportSummary, ImportCredential, CommitResult } from '@/lib/user-import';
import MemberIdControls from '../MemberIdControls';
import { formatMemberId, validateMemberIdFormat } from '@/lib/member-id';
import { Alert, Badge } from '@/components/ui';

const TEMPLATE_CSV =
  'name,email,role,program,password,memberId\n' +
  'Jane Doe,jane@example.com,student,Web Development Bootcamp,,\n' +
  'John Smith,john@example.com,mentor,,CustomPass123,MEM-2026-0007\n' +
  'Sara Ali,sara@example.com,student,,auto,\n';

type Phase = 'input' | 'preview' | 'done';
type RowFilter = 'all' | 'ok' | 'warning' | 'error';

type CommitSuccess = Extract<CommitResult, { ok: true }>;

type Props = {
  memberIdRequired: boolean;
  memberIdFormat: string;
};

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportForm({ memberIdRequired, memberIdFormat }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('input');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ImportRowValidation[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [sendEmails, setSendEmails] = useState(true);
  const [result, setResult] = useState<CommitSuccess | null>(null);
  const [revealPasswords, setRevealPasswords] = useState(false);
  const [filter, setFilter] = useState<RowFilter>('all');

  // Member ID rules
  const [required, setRequired] = useState(memberIdRequired);
  const [format, setFormat] = useState(memberIdFormat);
  const [autoGenerate, setAutoGenerate] = useState(memberIdRequired);
  const [appliedFormat, setAppliedFormat] = useState('');

  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const formatError = validateMemberIdFormat(format);

  async function onFilePicked(file: File) {
    setError('');
    try {
      const text = await file.text();
      setCsv(text);
      setFileName(file.name);
    } catch {
      setError('Could not read file');
    }
  }

  function doValidate(useFormat: string) {
    setError('');
    start(async () => {
      const res = await validateImportAction({
        csv,
        memberIdFormat: useFormat,
        memberIdRequired: required,
      });
      if (res.ok) {
        setRows(res.rows);
        setSummary(res.summary);
        setAppliedFormat(useFormat);
        setFilter('all');
        setPhase('preview');
      } else {
        setError(res.error);
      }
    });
  }

  function doCommit() {
    setError('');
    start(async () => {
      const res = await commitImportAction({
        rows: rows.map((r) => ({
          line: r.line,
          name: r.name,
          email: r.email,
          role: r.role,
          program: r.program,
          password: r.password,
          hasExplicitPassword: r.hasExplicitPassword,
          memberId: r.memberId,
          memberIdSource: r.memberIdSource,
          status: r.status,
          error: r.error,
          programId: r.programId,
          programName: r.programName,
          warnings: r.warnings,
        })),
        sendEmails,
      });
      if (res.ok) {
        setResult(res);
        setPhase('done');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function reset() {
    setPhase('input');
    setCsv('');
    setFileName('');
    setRows([]);
    setSummary(null);
    setResult(null);
    setError('');
    setRevealPasswords(false);
    setAppliedFormat('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const filteredRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  const stepIndex = phase === 'input' ? 0 : phase === 'preview' ? 1 : 2;

  return (
    <div className="space-y-5">
      <Steps current={stepIndex} />
      {error && <Alert>{error}</Alert>}

      {/* ================================================================ */}
      {/* Step 1 — input                                                   */}
      {/* ================================================================ */}
      {phase === 'input' && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5">
            {/* Dropzone */}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFilePicked(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFilePicked(f);
              }}
              className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-[var(--radius-lg)] border-2 border-dashed text-center transition ${
                dragging ? 'border-primary bg-hero' : 'border-border hover:bg-hero/40'
              }`}
            >
              <span className="grid place-items-center w-12 h-12 rounded-full bg-hero">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </span>
              <span className="text-sm font-medium">
                {fileName ? fileName : 'Drop your CSV here or click to upload'}
              </span>
              <span className="text-xs text-muted">
                {fileName ? `${csv.split(/\r?\n/).filter(Boolean).length - 1} data rows detected` : '.csv files, up to 500 rows'}
              </span>
            </button>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">or paste</span>
              <span className="flex-1 h-px bg-border" />
            </div>

            <textarea
              className="input min-h-[180px] font-mono text-xs"
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setFileName('');
              }}
              placeholder={TEMPLATE_CSV}
              spellCheck={false}
              aria-label="CSV text"
            />

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <button type="button" onClick={() => download('lms-users-template.csv', TEMPLATE_CSV)} className="btn-ghost text-sm">
                Download template
              </button>
              <button
                type="button"
                onClick={() => doValidate(autoGenerate && !formatError ? format : '')}
                disabled={pending || !csv.trim()}
                className="btn-primary h-11 px-6"
              >
                {pending ? 'Validating…' : 'Validate & preview'}
              </button>
            </div>
          </div>

          {/* Side: columns + member ID rules */}
          <aside className="space-y-4">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-3">
              <h3 className="text-sm font-semibold">Columns</h3>
              <ul className="space-y-2 text-xs">
                <Col name="name" req>Full name</Col>
                <Col name="email" req>Login email (must be unique)</Col>
                <Col name="role">admin / mentor / student (default student)</Col>
                <Col name="program">Must match an existing program name</Col>
                <Col name="password">Min 6 chars — blank or <code>auto</code> to generate</Col>
                <Col name="memberId" req={required}>
                  {required ? 'Required — or auto-generate below' : 'Optional — or auto-generate below'}
                </Col>
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-4">
              <h3 className="text-sm font-semibold">Member IDs</h3>
              <MemberIdControls
                required={required}
                format={format}
                onRequiredChange={(v) => {
                  setRequired(v);
                  if (v) setAutoGenerate(true);
                }}
                onFormatChange={setFormat}
              />
              <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
                />
                <span>
                  Auto-generate IDs for rows without one
                  <span className="block text-xs text-muted">Continues from the highest existing ID for this format.</span>
                </span>
              </label>
            </div>
          </aside>
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 2 — preview                                                 */}
      {/* ================================================================ */}
      {phase === 'preview' && summary && (() => {
        const creatable = summary.ok + summary.warnings;
        const missingIdErrors = rows.filter((r) => r.status === 'error' && r.error?.startsWith('Member ID is required')).length;
        const needsIdPrompt = summary.missingMemberIds > 0 || missingIdErrors > 0;
        return (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Stat label="Total rows" value={summary.total} />
              <Stat label="Ready" value={summary.ok} tone="success" />
              <Stat label="Warnings" value={summary.warnings} tone="warning" />
              <Stat label="Errors" value={summary.errors} tone="danger" />
              <Stat label="IDs generated" value={summary.generatedMemberIds} />
            </div>

            {/* Member ID prompt */}
            {needsIdPrompt && (
              <div className={`rounded-[var(--radius-lg)] border p-5 space-y-3 ${missingIdErrors ? 'border-danger/50 bg-danger/5' : 'border-warning/50 bg-warning/5'}`}>
                <div>
                  <h3 className="text-sm font-semibold">
                    {missingIdErrors
                      ? `${missingIdErrors} row${missingIdErrors === 1 ? '' : 's'} can't be imported without a member ID`
                      : `${summary.missingMemberIds} user${summary.missingMemberIds === 1 ? '' : 's'} will be created without a member ID`}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Enter a format and we&apos;ll give everyone without an ID the next number automatically.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input font-mono uppercase sm:max-w-xs"
                    value={format}
                    onChange={(e) => setFormat(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="MEM-{YYYY}-{####}"
                    aria-label="Member ID format"
                  />
                  <button
                    type="button"
                    onClick={() => doValidate(format)}
                    disabled={pending || !!formatError}
                    className="btn-primary h-10 px-5 text-sm"
                  >
                    {pending ? 'Generating…' : 'Generate IDs'}
                  </button>
                </div>
                {formatError ? (
                  <p className="text-xs text-danger">{formatError}</p>
                ) : (
                  <p className="text-xs text-muted">
                    e.g. <span className="font-mono text-text">{formatMemberId(format, 1)}</span>,{' '}
                    <span className="font-mono text-text">{formatMemberId(format, 2)}</span>, …
                  </p>
                )}
              </div>
            )}

            {appliedFormat && summary.generatedMemberIds > 0 && (
              <Alert tone="success">
                Generated {summary.generatedMemberIds} member ID{summary.generatedMemberIds === 1 ? '' : 's'} using{' '}
                <span className="font-mono">{appliedFormat}</span>.
              </Alert>
            )}

            {/* Rows */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-border">
                <div className="inline-flex p-0.5 rounded-[var(--radius-md)] bg-bg border border-border text-xs">
                  {(
                    [
                      ['all', `All ${summary.total}`],
                      ['ok', `Ready ${summary.ok}`],
                      ['warning', `Warnings ${summary.warnings}`],
                      ['error', `Errors ${summary.errors}`],
                    ] as [RowFilter, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilter(k)}
                      aria-pressed={filter === k}
                      className={`h-7 px-2.5 rounded-[calc(var(--radius-md)-2px)] font-medium transition ${
                        filter === k ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revealPasswords}
                      onChange={(e) => setRevealPasswords(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    Show passwords
                  </label>
                  {summary.errors > 0 && (
                    <button
                      type="button"
                      className="btn-ghost h-8 text-xs"
                      onClick={() =>
                        download(
                          'import-errors.csv',
                          'line,name,email,error\n' +
                            rows
                              .filter((r) => r.status === 'error')
                              .map((r) => [String(r.line), r.name, r.email, r.error ?? ''].map(csvField).join(','))
                              .join('\n')
                        )
                      }
                    >
                      Download errors
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead className="bg-bg border-b border-border sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted">
                      <th className="px-3 py-2.5 font-medium w-12">#</th>
                      <th className="px-3 py-2.5 font-medium">Name</th>
                      <th className="px-3 py-2.5 font-medium">Email</th>
                      <th className="px-3 py-2.5 font-medium">Member ID</th>
                      <th className="px-3 py-2.5 font-medium">Role</th>
                      <th className="px-3 py-2.5 font-medium">Program</th>
                      <th className="px-3 py-2.5 font-medium">Password</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((r) => (
                      <tr key={r.line} className={r.status === 'error' ? 'bg-danger/5' : r.status === 'warning' ? 'bg-warning/5' : ''}>
                        <td className="px-3 py-2 text-muted tabular-nums">{r.line}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]">
                          {r.name || <span className="text-muted italic">—</span>}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[200px]">
                          {r.email || <span className="text-muted italic">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.memberId ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-xs">{r.memberId}</span>
                              {r.memberIdSource === 'generated' && (
                                <span className="text-[9px] font-semibold uppercase px-1 rounded bg-hero">auto</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone="muted">{r.role}</Badge>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[140px] text-muted">
                          {r.programName ?? (r.program || '—')}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {r.status === 'error' ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span className={r.hasExplicitPassword ? 'text-muted' : ''}>
                              {revealPasswords ? r.password : '••••••••'}
                              <span className="ml-1 text-[10px] text-muted">
                                {r.hasExplicitPassword ? '(CSV)' : '(auto)'}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.status === 'ok' && <Badge tone="success" dot>ready</Badge>}
                          {r.status === 'warning' && <Badge tone="warning" dot>warning</Badge>}
                          {r.status === 'error' && <Badge tone="danger" dot>error</Badge>}
                          {r.error && (
                            <p className="text-xs text-danger mt-1 max-w-[240px]">{r.error}</p>
                          )}
                          {r.status === 'warning' && r.warnings?.length ? (
                            <p className="text-xs text-muted mt-1 max-w-[240px]">{r.warnings.join(' · ')}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Email + actions */}
            <label className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-border bg-surface cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-medium">Email each user their credentials</span>
                <span className="block text-xs text-muted">
                  {sendEmails
                    ? 'Emails are sent in the background (member ID included). You can also download credentials on the next screen.'
                    : "Credentials will only be shown on the next screen — download them before leaving."}
                </span>
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <button type="button" onClick={reset} className="btn-outline h-11">
                Back
              </button>
              <div className="flex flex-col sm:items-end gap-1">
                <button
                  type="button"
                  onClick={doCommit}
                  disabled={pending || creatable === 0}
                  className="btn-primary h-11 px-6"
                >
                  {pending ? 'Creating…' : `Create ${creatable} user${creatable === 1 ? '' : 's'}`}
                </button>
                {creatable === 0 && <p className="text-xs text-danger">No valid rows to create.</p>}
                {summary.errors > 0 && creatable > 0 && (
                  <p className="text-xs text-muted">{summary.errors} error row{summary.errors === 1 ? '' : 's'} will be skipped.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================ */}
      {/* Step 3 — done                                                    */}
      {/* ================================================================ */}
      {phase === 'done' && result && (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <div className="bg-hero px-6 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-full bg-success text-white shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-semibold">Import complete</h2>
                <p className="text-sm text-muted">
                  {result.created} created · {result.skipped} skipped
                  {result.failed.length > 0 && ` · ${result.failed.length} failed`}
                </p>
              </div>
            </div>
          </div>

          {result.failed.length > 0 && (
            <div className="bg-surface border border-danger/40 rounded-[var(--radius-lg)] p-5 space-y-3">
              <h3 className="font-medium text-sm text-danger">Failed rows</h3>
              <ul className="text-sm divide-y divide-border border border-border rounded-[var(--radius-md)]">
                {result.failed.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-muted w-10 shrink-0 tabular-nums">#{f.line}</span>
                    <span className="truncate flex-1">{f.email}</span>
                    <span className="text-xs text-danger">{f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.credentials.length > 0 && (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-medium text-sm">Credentials</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revealPasswords}
                      onChange={(e) => setRevealPasswords(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    Show
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      download(
                        'lms-import-credentials.csv',
                        'name,email,member_id,password\n' +
                          result.credentials
                            .map((c) => [c.name, c.email, c.memberId ?? '', c.password].map(csvField).join(','))
                            .join('\n')
                      )
                    }
                    className="btn-primary h-9 text-sm"
                  >
                    Download CSV
                  </button>
                </div>
              </div>
              <Alert tone="info">
                Save these now — they won&apos;t be shown again. Test one login before sharing with students.
              </Alert>
              <div className="max-h-[400px] overflow-auto border border-border rounded-[var(--radius-md)]">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-bg sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Member ID</th>
                      <th className="px-3 py-2 font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.credentials.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 truncate max-w-[160px]">{c.name}</td>
                        <td className="px-3 py-2 truncate max-w-[220px]">{c.email}</td>
                        <td className="px-3 py-2 font-mono text-xs">{c.memberId || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {revealPasswords ? c.password : '••••••••'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={reset} className="btn-outline h-11">
              Import more
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              className="btn-primary h-11 px-6"
            >
              View users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function csvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function Steps({ current }: { current: number }) {
  const steps = ['Upload', 'Review', 'Done'];
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
            <span
              className={`grid place-items-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 ${
                done ? 'bg-success text-white' : active ? 'bg-primary text-primary-fg' : 'bg-hero text-muted'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-sm ${active ? 'font-semibold' : 'text-muted'}`}>{s}</span>
            {i < steps.length - 1 && <span className="flex-1 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function Col({ name, req = false, children }: { name: string; req?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <code className="shrink-0 px-1.5 py-0.5 rounded bg-hero text-[11px] h-fit">{name}</code>
      <span className="text-muted">
        {req && <span className="text-danger font-semibold">required · </span>}
        {children}
      </span>
    </li>
  );
}

function Stat({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number;
  tone?: 'success' | 'danger' | 'warning' | 'muted';
}) {
  const cls =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
      ? 'text-danger'
      : tone === 'warning'
      ? 'text-warning'
      : 'text-text';
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${cls}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted mt-0.5">{label}</p>
    </div>
  );
}