'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import {
  validateImportAction,
  commitImportAction,
} from './actions';
import type { ImportRowValidation } from '@/lib/user-import';

const TEMPLATE_CSV =
  'name,email,role,program\n' +
  'Jane Doe,jane@example.com,student,Web Development Bootcamp\n' +
  'John Smith,john@example.com,mentor,\n';

type Phase = 'input' | 'preview' | 'done';

type CommitSuccess = {
  created: number;
  skipped: number;
  failed: { line: number; email: string; reason: string }[];
  credentials: { name: string; email: string; password: string }[];
};

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lms-users-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('input');
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<ImportRowValidation[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    ok: number;
    errors: number;
    warnings: number;
  } | null>(null);
  const [sendEmails, setSendEmails] = useState(true);
  const [result, setResult] = useState<CommitSuccess | null>(null);

  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  async function onFilePicked(file: File) {
    setError('');
    try {
      const text = await file.text();
      setCsv(text);
    } catch {
      setError('Could not read file');
    }
  }

  function doValidate() {
    setError('');
    start(async () => {
      const res = await validateImportAction({ csv });
      if (res.ok) {
        setRows(res.rows);
        setSummary(res.summary);
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
    setRows([]);
    setSummary(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  // -------------------------------------------------------------------------
  // Phase: input
  // -------------------------------------------------------------------------
  if (phase === 'input') {
    return (
      <div className="card space-y-5">
        {error && (
          <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
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
            className="btn-outline"
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-sm text-muted hover:underline"
          >
            Download template
          </button>
        </div>

        <div>
          <label className="label">Or paste CSV</label>
          <textarea
            className="input min-h-[180px] font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={TEMPLATE_CSV}
            spellCheck={false}
          />
          <p className="text-xs text-muted mt-1">
            Columns: <code>name, email, role, program</code>. Role defaults to{' '}
            <code>student</code>. Program name is optional — must match an existing program.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={doValidate}
            disabled={pending || !csv.trim()}
            className="btn-primary"
          >
            {pending ? 'Validating…' : 'Validate & preview'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: preview
  // -------------------------------------------------------------------------
  if (phase === 'preview' && summary) {
    const creatable = summary.ok + summary.warnings;

    return (
      <div className="space-y-5">
        {error && (
          <div className="text-sm px-3 py-2 rounded-md border bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="card grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total rows" value={summary.total} tone="muted" />
          <Stat label="Ready" value={summary.ok} tone="success" />
          <Stat label="Warnings" value={summary.warnings} tone="warning" />
          <Stat label="Errors" value={summary.errors} tone="danger" />
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Program</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted">{r.line}</td>
                    <td className="px-3 py-2 truncate max-w-[160px]">
                      {r.name || <span className="text-muted italic">—</span>}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[200px]">
                      {r.email || <span className="text-muted italic">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge-muted">{r.role}</span>
                    </td>
                    <td className="px-3 py-2 truncate max-w-[160px] text-muted">
                      {r.programName ?? r.program ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'ok' && (
                        <span className="badge-success">ready</span>
                      )}
                      {r.status === 'warning' && (
                        <span className="badge-warning" title={r.warnings?.join(' · ')}>
                          warning
                        </span>
                      )}
                      {r.status === 'error' && (
                        <span className="badge-danger" title={r.error}>
                          error
                        </span>
                      )}
                      {r.status !== 'ok' && r.error && (
                        <p className="text-xs text-muted mt-1 max-w-[220px]">
                          {r.error}
                        </p>
                      )}
                      {r.status === 'warning' && r.warnings?.length ? (
                        <p className="text-xs text-muted mt-1 max-w-[220px]">
                          {r.warnings.join(' · ')}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
            />
            Email each user their temporary password
          </label>
          <p className="text-xs text-muted">
            {sendEmails
              ? 'Emails will be sent in the background. You can also copy passwords from the next screen.'
              : 'Passwords will only be shown on the next screen — copy them before leaving.'}
          </p>
        </div>

        <div className="flex justify-between gap-2">
          <button type="button" onClick={reset} className="btn-outline">
            Back
          </button>
          <button
            type="button"
            onClick={doCommit}
            disabled={pending || creatable === 0}
            className="btn-primary"
          >
            {pending
              ? 'Creating…'
              : `Create ${creatable} user${creatable === 1 ? '' : 's'}`}
          </button>
        </div>

        {creatable === 0 && (
          <p className="text-sm text-danger text-right">
            No valid rows to create.
          </p>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: done
  // -------------------------------------------------------------------------
  if (phase === 'done' && result) {
    return (
      <div className="space-y-5">
        <div className="card space-y-2">
          <h2 className="font-semibold">Import complete</h2>
          <p className="text-sm text-muted">
            {result.created} created · {result.skipped} skipped
            {result.failed.length > 0 && ` · ${result.failed.length} failed`}
          </p>
        </div>

        {result.failed.length > 0 && (
          <div className="card space-y-2">
            <h3 className="font-medium text-sm">Failed rows</h3>
            <ul className="text-sm divide-y divide-border border border-border rounded-md">
              {result.failed.map((f, i) => (
                <li key={i} className="flex items-center gap-2 p-2">
                  <span className="text-muted w-8 shrink-0">#{f.line}</span>
                  <span className="truncate flex-1">{f.email}</span>
                  <span className="text-xs text-danger">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.credentials.length > 0 && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-sm">
                Temporary credentials
              </h3>
              <button
                type="button"
                onClick={() => {
                  const csv =
                    'name,email,password\n' +
                    result.credentials
                      .map(
                        (c) =>
                          `${csvField(c.name)},${csvField(c.email)},${csvField(
                            c.password
                          )}`
                      )
                      .join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'lms-import-credentials.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs text-muted hover:underline"
              >
                Download CSV
              </button>
            </div>
            <p className="text-xs text-muted">
              Save these now — they won't be shown again.
            </p>
            <div className="max-h-[400px] overflow-y-auto border border-border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-bg sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {result.credentials.map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 truncate max-w-[160px]">
                        {c.name}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[220px]">
                        {c.email}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {c.password}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={reset} className="btn-outline">
            Import more
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="btn-primary"
          >
            View users
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function csvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'muted';
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'danger'
      ? 'text-[var(--color-danger)]'
      : tone === 'warning'
      ? 'text-[var(--color-warning)]'
      : 'text-muted';
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted mt-0.5">
        {label}
      </p>
    </div>
  );
}