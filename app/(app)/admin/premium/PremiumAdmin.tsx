'use client';

// =============================================================================
// FILE: app/(app)/admin/premium/PremiumAdmin.tsx   (NEW FILE)
// Client parts of Admin → Premium: members table with bulk extend / revoke,
// the "Grant Premium" dialog (people or a whole program) and codes.
// =============================================================================

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import { Modal, useConfirm, useSudo, useToast } from '@/components/feedback';
import { Badge } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { formatDate } from '@/lib/time';
import { isLifetime } from '@/lib/entitlements';
import type { MemberRow, CodeRow } from '@/lib/premium';
import { grantPremiumAction, revokePremiumAction, createCodesAction, disableCodeAction, findPeopleAction } from './actions';

type ProgramOpt = { id: string; name: string; students: number };

const DURATIONS = [
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
  { days: 0, label: 'Lifetime' },
];

const STATUS_TONE = { active: 'success', expiring: 'warning', expired: 'muted', free: 'muted' } as const;
const STATUS_LABEL = { active: 'active', expiring: 'ending soon', expired: 'ended', free: 'free' } as const;

function until(iso: string | null) {
  if (!iso) return '—';
  return isLifetime(iso) ? 'Lifetime' : formatDate(iso);
}

function DurationPicker({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const custom = !DURATIONS.some((d) => d.days === value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DURATIONS.map((d) => (
          <button
            key={d.days}
            type="button"
            aria-pressed={value === d.days}
            onClick={() => onChange(d.days)}
            className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
              value === d.days ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">or</span>
        <input
          type="number"
          min={1}
          max={3650}
          className="input h-9 w-24"
          value={custom ? value : ''}
          placeholder="days"
          onChange={(e) => onChange(Math.max(1, Math.min(3650, Number(e.target.value) || 1)))}
          aria-label="Custom number of days"
        />
        <span className="text-muted">days</span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grant dialog
// ---------------------------------------------------------------------------

function GrantDialog({ open, onClose, programs }: { open: boolean; onClose: () => void; programs: ProgramOpt[] }) {
  const router = useRouter();
  const toast = useToast();
  const sudo = useSudo();
  const [mode, setMode] = useState<'people' | 'program'>('people');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [picked, setPicked] = useState<{ id: string; name: string }[]>([]);
  const [programId, setProgramId] = useState('');
  const [includeMentors, setIncludeMentors] = useState(false);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => findPeopleAction(q).then(setHits).catch(() => setHits([])), 220);
    return () => clearTimeout(t);
  }, [q]);

  function reset() {
    setQ('');
    setHits([]);
    setPicked([]);
    setProgramId('');
    setNote('');
    setErr('');
  }

  function submit() {
    setErr('');
    start(async () => {
      const payload =
        mode === 'program'
          ? { programId, includeMentors, days, mode: 'extend', note }
          : { userIds: picked.map((p) => p.id), days, mode: 'extend', note };
      const r = await sudo(() => grantPremiumAction(payload));
      if (r.ok) {
        toast.success(`Premium given to ${r.changed} ${r.changed === 1 ? 'person' : 'people'}.`);
        reset();
        onClose();
        router.refresh();
      } else if (r.error !== 'Cancelled') setErr(r.error);
    });
  }

  const ready = mode === 'program' ? !!programId : picked.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grant Premium"
      description="Adds time on top of any Premium they already have. They get a notification."
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={!ready || pending} onClick={submit}>
            {pending ? 'Granting…' : 'Grant Premium'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex p-1 rounded-full border border-border bg-bg/60" role="tablist">
          {(['people', 'program'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-8 px-4 rounded-full text-sm font-medium ${mode === m ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text'}`}
            >
              {m === 'people' ? 'People' : 'Whole program'}
            </button>
          ))}
        </div>

        {mode === 'people' ? (
          <div className="space-y-2">
            <input className="input" placeholder="Search by name, email or member ID…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {hits.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-border divide-y divide-border">
                {hits.map((h) => {
                  const on = picked.some((p) => p.id === h.id);
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-hero"
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x.id !== h.id) : [...p, { id: h.id, name: h.name }]))}
                      >
                        <span className={`grid place-items-center w-4 h-4 rounded border ${on ? 'bg-primary border-primary text-primary-fg' : 'border-border'}`}>
                          {on && <NavIcon name="attendance" size={10} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{h.name}</span>
                          <span className="block truncate text-xs text-muted">{h.email}</span>
                        </span>
                        <span className="text-[11px] text-muted capitalize">{h.role}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {picked.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary/10 border border-primary/30 text-xs"
                    onClick={() => setPicked((x) => x.filter((y) => y.id !== p.id))}
                  >
                    {p.name} <NavIcon name="close" size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <select className="input" value={programId} onChange={(e) => setProgramId(e.target.value)} aria-label="Program">
              <option value="">Choose a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.students} learners)
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeMentors} onChange={(e) => setIncludeMentors(e.target.checked)} />
              Include the program&apos;s mentors
            </label>
            <p className="text-xs text-muted">You&apos;ll be asked to confirm your password for program-wide grants.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">How long</p>
          <DurationPicker value={days} onChange={setDays} />
        </div>
        <label className="block text-sm">
          <span className="font-medium">Note (optional, kept in history)</span>
          <input className="input mt-1.5" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by bank transfer, ref 1234" />
        </label>
        {err && (
          <p role="alert" className="text-sm text-danger">
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function MembersPanel({ members, canGrant, programs }: { members: MemberRow[]; canGrant: boolean; programs: ProgramOpt[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [grantOpen, setGrantOpen] = useState(false);
  const [pending, start] = useTransition();

  function extend(ids: string[], clear: () => void, days: number) {
    start(async () => {
      const r = await grantPremiumAction({ userIds: ids, days, mode: 'extend', note: '' });
      if (r.ok) {
        toast.success(`Extended for ${r.changed} ${r.changed === 1 ? 'person' : 'people'}.`);
        clear();
        router.refresh();
      } else toast.error(r.error);
    });
  }
  async function revoke(ids: string[], clear: () => void) {
    const ok = await confirm({
      title: `End Premium for ${ids.length} ${ids.length === 1 ? 'person' : 'people'}?`,
      body: 'Premium themes pause right away and the organisation theme is shown. Their choice is kept and comes back if you grant Premium again.',
      tone: 'danger',
      confirmLabel: 'End Premium',
    });
    if (!ok) return;
    start(async () => {
      const r = await revokePremiumAction({ userIds: ids });
      if (r.ok) {
        toast.success(`Premium ended for ${r.changed} ${r.changed === 1 ? 'person' : 'people'}.`);
        clear();
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <DataTable
        rows={members}
        rowKey={(r) => r.id}
        caption="Premium members"
        searchText={(r) => `${r.name} ${r.email} ${r.role}`}
        searchPlaceholder="Search members…"
        toolbar={
          canGrant && (
            <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => setGrantOpen(true)}>
              <NavIcon name="crown" size={16} /> Grant Premium
            </button>
          )
        }
        empty="No one in this list."
        initialSort={{ key: 'until', dir: 'asc' }}
        bulkActions={
          canGrant
            ? (ids, clear) => (
                <>
                  <button type="button" className="btn-outline h-8 px-3 text-xs" disabled={pending} onClick={() => extend(ids, clear, 30)}>
                    +1 month
                  </button>
                  <button type="button" className="btn-outline h-8 px-3 text-xs" disabled={pending} onClick={() => extend(ids, clear, 365)}>
                    +1 year
                  </button>
                  <button type="button" className="btn-danger h-8 px-3 text-xs" disabled={pending} onClick={() => revoke(ids, clear)}>
                    End Premium
                  </button>
                </>
              )
            : undefined
        }
        columns={[
          {
            key: 'name',
            header: 'Member',
            sort: (r) => r.name.toLowerCase(),
            cell: (r) => (
              <span className="block min-w-0">
                <span className="block font-medium truncate">{r.name}</span>
                <span className="block text-xs text-muted truncate">{r.email}</span>
              </span>
            ),
          },
          { key: 'role', header: 'Role', hideOnMobile: true, sort: (r) => r.role, cell: (r) => <span className="capitalize text-muted">{r.role === 'student' ? 'learner' : r.role}</span> },
          { key: 'status', header: 'Status', sort: (r) => r.status, cell: (r) => <Badge tone={STATUS_TONE[r.status]} dot>{STATUS_LABEL[r.status]}</Badge> },
          { key: 'until', header: 'Until', sort: (r) => (r.until ? new Date(r.until).getTime() : 0), cell: (r) => <span className="tabular-nums">{until(r.until)}</span> },
          { key: 'source', header: 'From', hideOnMobile: true, cell: (r) => <span className="text-muted text-xs">{r.source === 'code' ? 'code' : r.source ? 'admin' : '—'}</span> },
        ]}
      />
      <GrantDialog open={grantOpen} onClose={() => setGrantOpen(false)} programs={programs} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

const CODE_TONE = { active: 'success', used: 'muted', expired: 'muted', disabled: 'danger' } as const;

export function CodesPanel({ codes, canCodes, programs }: { codes: CodeRow[]; canCodes: boolean; programs: ProgramOpt[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string[] | null>(null);
  const [form, setForm] = useState({ count: 1, days: 30, maxUses: 1, expiresAt: '', programId: '', label: '' });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const programName = (id: string | null) => programs.find((p) => p.id === id)?.name ?? '';

  function create() {
    setErr('');
    start(async () => {
      const r = await createCodesAction(form);
      if (r.ok) {
        setOpen(false);
        setCreated(r.codes);
        router.refresh();
      } else setErr(r.error);
    });
  }

  function download(list: string[]) {
    const csv = 'code\n' + list.join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `premium-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <DataTable
        rows={codes}
        rowKey={(r) => r.id}
        caption="Premium codes"
        searchText={(r) => `${r.label} ${r.hint} ${programName(r.programId)}`}
        searchPlaceholder="Search codes…"
        toolbar={
          canCodes && (
            <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => setOpen(true)}>
              <NavIcon name="plus" size={16} /> New codes
            </button>
          )
        }
        empty="No codes yet."
        columns={[
          {
            key: 'code',
            header: 'Code',
            cell: (r) => (
              <span className="block min-w-0">
                <span className="block font-mono text-xs">NIB-••••-••••-{r.hint}</span>
                {r.label && <span className="block text-xs text-muted truncate">{r.label}</span>}
              </span>
            ),
          },
          { key: 'days', header: 'Gives', sort: (r) => r.days || 99999, cell: (r) => (r.days ? `${r.days} days` : 'Lifetime') },
          { key: 'uses', header: 'Used', numeric: true, sort: (r) => r.uses, cell: (r) => `${r.uses}/${r.maxUses}` },
          { key: 'program', header: 'Program', hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{programName(r.programId) || 'Anyone'}</span> },
          { key: 'ends', header: 'Code ends', hideOnMobile: true, cell: (r) => <span className="text-xs">{r.expiresAt ? formatDate(r.expiresAt) : 'Never'}</span> },
          { key: 'state', header: 'State', sort: (r) => r.state, cell: (r) => <Badge tone={CODE_TONE[r.state]} dot>{r.state}</Badge> },
          {
            key: 'act',
            header: '',
            cell: (r) =>
              canCodes && r.state === 'active' ? (
                <button
                  type="button"
                  className="btn-ghost h-8 px-2.5 text-xs text-danger"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Disable this code?', body: 'Nobody can redeem it after this. People who already used it keep their Premium.', tone: 'danger', confirmLabel: 'Disable' }))) return;
                    const res = await disableCodeAction({ id: r.id });
                    if (res.ok) {
                      toast.success('Code disabled.');
                      router.refresh();
                    } else toast.error(res.error);
                  }}
                >
                  Disable
                </button>
              ) : null,
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New premium codes"
        description="Codes are shown once — copy or download them before closing."
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={create}>
              {pending ? 'Creating…' : `Create ${form.count} code${form.count === 1 ? '' : 's'}`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">How many codes</span>
              <input type="number" min={1} max={200} className="input mt-1.5" value={form.count} onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Uses per code</span>
              <input type="number" min={1} max={10000} className="input mt-1.5" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Math.max(1, Math.min(10000, Number(e.target.value) || 1)) })} />
            </label>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Each use gives</p>
            <DurationPicker value={form.days} onChange={(d) => setForm({ ...form, days: d })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">Code stops working on (optional)</span>
              <input type="date" className="input mt-1.5" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Only for a program (optional)</span>
              <select className="input mt-1.5" value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })}>
                <option value="">Anyone</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Label (optional)</span>
            <input className="input mt-1.5" maxLength={80} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Spring scholarship" />
          </label>
          {err && (
            <p role="alert" className="text-sm text-danger">
              {err}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title={`${created?.length ?? 0} new code${created?.length === 1 ? '' : 's'}`}
        description="Copy or download them now. For security only a fingerprint is stored, so they can't be shown again."
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => created && download(created)}>
              Download CSV
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText((created ?? []).join('\n'));
                  toast.success('Copied to clipboard.');
                } catch {
                  toast.error('Copy failed — select the codes and copy them by hand.');
                }
              }}
            >
              Copy all
            </button>
          </>
        }
      >
        <ul className="max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-border divide-y divide-border font-mono text-sm select-all">
          {(created ?? []).map((c) => (
            <li key={c} className="px-3 py-2">
              {c}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
