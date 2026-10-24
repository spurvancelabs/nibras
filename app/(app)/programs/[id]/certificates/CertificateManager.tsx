// =============================================================================
// FILE: app/(app)/programs/[id]/certificates/CertificateManager.tsx  (NEW FILE)
// Design + completion rules (with live preview), eligibility table, issue
// selected (optionally overriding rules / emailing students), revoke.
// =============================================================================

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import CertificateView from '@/components/CertificateView';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import type { CertConfig, EligibilityRow, CertificateView as Cert } from '@/lib/certificates';
import { formatDate } from '@/lib/time';
import { saveCertConfigAction, issueCertificatesAction, revokeCertificateAction } from '../../actions';
import { Alert, Badge } from '@/components/ui';

type Props = {
  programId: string;
  programName: string;
  canIssue: boolean;
  cfg: CertConfig;
  rows: EligibilityRow[];
  issued: Cert[];
  defaults: { issuerName: string; signatoryName: string; signatoryTitle: string; signatureImage: string; logo: string; footerText: string; prefix: string };
  verifyBase: string;
};

export default function CertificateManager({ programId, programName, canIssue, cfg: initialCfg, rows, issued, defaults, verifyBase }: Props) {
  const router = useRouter();
  const [cfg, setCfg] = useState<CertConfig>(initialCfg);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [override, setOverride] = useState(false);
  const [email, setEmail] = useState(true);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: React.ReactNode } | null>(null);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'not' | 'issued'>('all');

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'all' ? true : filter === 'issued' ? !!r.certificate : filter === 'eligible' ? r.eligible && !r.certificate : !r.eligible && !r.certificate
      ),
    [rows, filter]
  );
  const eligibleIds = rows.filter((r) => r.eligible && !r.certificate).map((r) => r.studentId);

  const sample: Cert = {
    id: 'preview',
    certNo: `${defaults.prefix}-2026-ABCD-2345`,
    status: 'issued',
    issuedAt: new Date().toISOString(),
    revokedAt: null,
    revokedReason: '',
    studentId: '',
    studentName: rows[0]?.name ?? 'Student Name',
    memberId: rows[0]?.memberId ?? '',
    programId,
    programName,
    programStart: null,
    programEnd: null,
    attendancePercent: 92,
    assignmentPercent: 85.5,
    quizPercent: 88,
    title: cfg.title,
    statement: cfg.statement,
    style: cfg.style,
    issuerName: defaults.issuerName,
    signatoryName: cfg.signatoryName || defaults.signatoryName,
    signatoryTitle: cfg.signatoryTitle || defaults.signatoryTitle,
    signatureImage: cfg.signatureImage || defaults.signatureImage,
    logo: defaults.logo,
    showScores: cfg.showScores,
    footerText: defaults.footerText,
  };

  function saveCfg() {
    setMsg(null);
    start(async () => {
      const r = await saveCertConfigAction({ programId, cfg });
      setMsg(r.ok ? { tone: 'success', text: 'Certificate design & rules saved.' } : { tone: 'error', text: r.error });
      if (r.ok) router.refresh();
    });
  }

  function issue(ids: string[]) {
    if (!ids.length) return;
    if (!confirm(`Issue ${ids.length} certificate${ids.length === 1 ? '' : 's'}${override ? ' (ignoring the completion rules)' : ''}?`)) return;
    setMsg(null);
    start(async () => {
      const r = await issueCertificatesAction({ programId, studentIds: ids, override, email });
      if (!r.ok) {
        setMsg({ tone: 'error', text: r.error });
        return;
      }
      setMsg({
        tone: r.skipped.length ? 'info' : 'success',
        text: (
          <>
            Issued {r.issued} certificate{r.issued === 1 ? '' : 's'}.
            {r.skipped.length > 0 && (
              <ul className="mt-1 text-xs list-disc pl-4">
                {r.skipped.slice(0, 10).map((s, i) => (
                  <li key={i}>
                    {s.name}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </>
        ),
      });
      setSelected(new Set());
      router.refresh();
    });
  }

  function revoke(id: string, name: string) {
    const reason = prompt(`Why are you revoking ${name}'s certificate? (shown on the verification page)`);
    if (!reason) return;
    start(async () => {
      const r = await revokeCertificateAction({ id, reason });
      setMsg(r.ok ? { tone: 'success', text: 'Certificate revoked.' } : { tone: 'error', text: r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {/* ---------------- Design & rules ---------------- */}
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 sm:p-6 grid xl:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-4">
          <h2 className="font-semibold">Design & completion rules</h2>
          <fieldset disabled={!canIssue} className="space-y-3 min-w-0">
            <div>
              <label className="label">Design</label>
              <div className="grid grid-cols-3 gap-2">
                {(['classic', 'modern', 'elegant'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setCfg({ ...cfg, style: s })} className={`h-10 rounded-[var(--radius-md)] border text-sm capitalize ${cfg.style === s ? 'border-primary bg-hero ring-1 ring-primary' : 'border-border'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" maxLength={80} value={cfg.title} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Statement</label>
              <input className="input" maxLength={200} value={cfg.statement} onChange={(e) => setCfg({ ...cfg, statement: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Signatory</label>
                <input className="input" maxLength={80} value={cfg.signatoryName} placeholder={defaults.signatoryName || 'Name'} onChange={(e) => setCfg({ ...cfg, signatoryName: e.target.value })} />
              </div>
              <div>
                <label className="label">Their title</label>
                <input className="input" maxLength={80} value={cfg.signatoryTitle} placeholder={defaults.signatoryTitle} onChange={(e) => setCfg({ ...cfg, signatoryTitle: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Signature image (optional)</label>
              <CloudinaryUpload value={cfg.signatureImage} onChange={(url) => setCfg({ ...cfg, signatureImage: url })} label="Upload signature" />
            </div>
            <div>
              <label className="label">Minimums to qualify (0 = not required)</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['minAttendance', 'Attendance %'],
                    ['minAssignments', 'Assignments %'],
                    ['minQuizzes', 'Quizzes %'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="text-xs text-muted">
                    {label}
                    <input className="input mt-1" type="number" min={0} max={100} value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={cfg.showScores} onChange={(e) => setCfg({ ...cfg, showScores: e.target.checked })} />
              Print scores on the certificate
            </label>
            {canIssue && (
              <button type="button" className="btn-primary h-10 px-5" disabled={pending} onClick={saveCfg}>
                {pending ? 'Saving…' : 'Save design & rules'}
              </button>
            )}
          </fieldset>
          {!canIssue && <p className="text-xs text-muted">Only admins can change the design or issue certificates.</p>}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted mb-2">Preview</p>
          <CertificateView c={sample} verifyUrl={`${verifyBase}/verify`} />
        </div>
      </section>

      {/* ---------------- Eligibility ---------------- */}
      <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold">Students</h2>
            <p className="text-xs text-muted">
              {eligibleIds.length} eligible and waiting · {rows.filter((r) => r.certificate).length} issued · {rows.length} total
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-0.5 rounded-[var(--radius-md)] bg-bg border border-border text-xs">
              {(['all', 'eligible', 'not', 'issued'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`h-7 px-2.5 rounded-[calc(var(--radius-md)-2px)] ${filter === f ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>
                  {f === 'all' ? 'All' : f === 'eligible' ? 'Eligible' : f === 'not' ? 'Not yet' : 'Issued'}
                </button>
              ))}
            </div>
            {canIssue && (
              <>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email students
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" title="Issue even if the minimums aren't met">
                  <input type="checkbox" className="w-4 h-4 accent-[var(--color-warning)]" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Ignore rules
                </label>
                <button type="button" className="btn-outline h-9 text-sm" disabled={pending || !eligibleIds.length} onClick={() => issue(eligibleIds)}>
                  Issue to all eligible ({eligibleIds.length})
                </button>
                <button type="button" className="btn-primary h-9 text-sm" disabled={pending || !selected.size} onClick={() => issue(Array.from(selected))}>
                  Issue selected ({selected.size})
                </button>
              </>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-bg border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
                <th className="px-4 py-3 font-medium">Assignments</th>
                <th className="px-4 py-3 font-medium">Quizzes</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-4 py-3">
                    {!r.certificate && canIssue && (
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--color-primary)]"
                        checked={selected.has(r.studentId)}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(r.studentId)) n.delete(r.studentId);
                            else n.add(r.studentId);
                            return n;
                          })
                        }
                        aria-label={`Select ${r.name}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.memberId || r.email}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.attendance.percent === null ? '—' : `${r.attendance.percent}%`}</td>
                  <td className="px-4 py-3 tabular-nums">{r.assignments.percent === null ? '—' : `${r.assignments.percent}%`}</td>
                  <td className="px-4 py-3 tabular-nums">{r.quizzes.percent === null ? '—' : `${r.quizzes.percent}%`}</td>
                  <td className="px-4 py-3">
                    {r.certificate ? (
                      <a href={`/certificates/${r.certificate.id}`} className="inline-flex items-center gap-1.5">
                        <Badge tone="success">issued {formatDate(r.certificate.issuedAt)}</Badge>
                      </a>
                    ) : r.eligible ? (
                      <Badge tone="primary">eligible</Badge>
                    ) : (
                      <span className="text-xs text-warning">{r.reasons.join(' · ')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nobody here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Issued ---------------- */}
      {issued.length > 0 && (
        <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
          <h2 className="font-semibold px-5 py-4 border-b border-border">Issued certificates ({issued.length})</h2>
          <ul className="divide-y divide-border">
            {issued.map((c) => (
              <li key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3 text-sm">
                <a href={`/certificates/${c.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="font-medium">{c.studentName}</span>
                  <span className="ml-2 font-mono text-xs text-muted">{c.certNo}</span>
                </a>
                <span className="text-xs text-muted">{formatDate(c.issuedAt)}</span>
                {c.status === 'revoked' ? (
                  <Badge tone="danger">revoked</Badge>
                ) : (
                  canIssue && (
                    <button type="button" className="text-xs text-danger underline" disabled={pending} onClick={() => revoke(c.id, c.studentName)}>
                      Revoke
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
