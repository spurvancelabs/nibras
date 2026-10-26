'use client';

// =============================================================================
// FILE: app/(app)/admin/automation/AutomationAdmin.tsx   (NEW FILE)
// Client parts of Admin → Account automation: rule cards + editor with live
// preview, dry run / run now, the review queue and run history.
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal, useConfirm, useSudo, useToast } from '@/components/feedback';
import DataTable from '@/components/DataTable';
import { Badge, EmptyNote, Panel } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { Toggle } from '@/components/settings-ui';
import { formatDate, formatDateTime, formatRelative } from '@/lib/time';
import type { Rule, RuleInput, EvalRow, FlagRow, RunRow } from '@/lib/automation';
import { saveRuleAction, deleteRuleAction, previewRuleAction, runRuleAction, resolveFlagAction, setExemptAction } from './actions';

type ProgramOpt = { id: string; name: string };

const DEFAULT_RULE: RuleInput = {
  name: 'Inactive learners',
  enabled: false,
  roles: ['student'],
  programIds: [],
  noLoginDays: 30,
  noSubmissionDays: 0,
  noAttendanceDays: 0,
  combine: 'any',
  newAccountDays: 14,
  remind: true,
  flag: true,
  flagAfterDays: 7,
  suspend: false,
  graceDays: 14,
  notifyMentors: true,
  maxSuspendPerRun: 25,
  frequency: 'daily',
};

function describe(r: RuleInput): string {
  const who = r.roles.map((x) => (x === 'student' ? 'learners' : 'mentors')).join(' & ');
  const checks = [
    r.noLoginDays ? `no sign-in for ${r.noLoginDays} days` : '',
    r.noSubmissionDays ? `no submission for ${r.noSubmissionDays} days` : '',
    r.noAttendanceDays ? `no attendance for ${r.noAttendanceDays} days` : '',
  ].filter(Boolean);
  const steps = [r.remind ? 'remind' : '', r.flag ? `flag${r.remind ? ` after ${r.flagAfterDays}d` : ''}` : '', r.suspend ? `pause after ${r.graceDays}d grace` : ''].filter(Boolean);
  return `${who[0].toUpperCase()}${who.slice(1)} with ${checks.join(r.combine === 'all' ? ' and ' : ' or ')} → ${steps.join(' → ')}`;
}

const ACTION_LABEL: Record<string, { label: string; tone: 'muted' | 'warning' | 'danger' | 'primary' | 'success' }> = {
  remind: { label: 'will be reminded', tone: 'primary' },
  flag: { label: 'will be flagged', tone: 'warning' },
  suspend: { label: 'will be paused', tone: 'danger' },
  wait: { label: 'waiting', tone: 'muted' },
  none: { label: 'no change', tone: 'muted' },
};

// ---------------------------------------------------------------------------
// Number field with on/off
// ---------------------------------------------------------------------------

function DaysCheck({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  const on = value > 0;
  return (
    <div className={`p-3 rounded-[var(--radius-md)] border ${on ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? 30 : 0)} className="accent-[var(--color-primary)]" />
        {label}
      </label>
      {on && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-muted">for</span>
          <input type="number" min={1} max={730} className="input h-9 w-24" value={value} onChange={(e) => onChange(Math.max(1, Math.min(730, Number(e.target.value) || 1)))} />
          <span className="text-muted">days</span>
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview table
// ---------------------------------------------------------------------------

function PreviewTable({ rows }: { rows: EvalRow[] }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.userId}
      caption="People this rule matches"
      searchText={(r) => `${r.name} ${r.email}`}
      searchPlaceholder="Search matched people…"
      pageSize={10}
      empty="Nobody matches right now."
      columns={[
        {
          key: 'name',
          header: 'Person',
          sort: (r) => r.name.toLowerCase(),
          cell: (r) => (
            <span className="block min-w-0">
              <span className="block font-medium truncate">{r.name}</span>
              <span className="block text-xs text-muted truncate">{r.reasons.join(' · ')}</span>
            </span>
          ),
        },
        { key: 'stage', header: 'Now', hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{r.stage ?? '—'}</span> },
        { key: 'action', header: 'Next run', sort: (r) => r.action, cell: (r) => <Badge tone={ACTION_LABEL[r.action].tone}>{ACTION_LABEL[r.action].label}</Badge> },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Rule editor
// ---------------------------------------------------------------------------

function RuleEditor({
  open,
  onClose,
  initial,
  ruleId,
  programs,
}: {
  open: boolean;
  onClose: () => void;
  initial: RuleInput;
  ruleId?: string;
  programs: ProgramOpt[];
}) {
  const router = useRouter();
  const toast = useToast();
  const sudo = useSudo();
  const [r, setR] = useState<RuleInput>(initial);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<{ rows: EvalRow[]; counts: Record<string, number>; cleared: number } | null>(null);
  const [pending, start] = useTransition();
  const [previewing, startPreview] = useTransition();
  const set = <K extends keyof RuleInput>(k: K, v: RuleInput[K]) => {
    setR((x) => ({ ...x, [k]: v }));
    setPreview(null);
  };

  function doPreview() {
    setErr('');
    startPreview(async () => {
      const res = await previewRuleAction({ id: ruleId, rule: r });
      if (res.ok) setPreview({ rows: res.rows, counts: res.counts, cleared: res.cleared });
      else setErr(res.error);
    });
  }
  function save() {
    setErr('');
    start(async () => {
      const res = await sudo(() => saveRuleAction({ id: ruleId, rule: r }));
      if (res.ok) {
        toast.success('Rule saved.');
        onClose();
        router.refresh();
      } else if (res.error !== 'Cancelled') setErr(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={ruleId ? 'Edit rule' : 'New automation rule'}
      description={describe(r)}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={doPreview} disabled={previewing}>
            {previewing ? 'Checking…' : 'Preview who matches'}
          </button>
          <span className="hidden sm:block flex-1" />
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save rule'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input className="input mt-1.5" maxLength={80} value={r.name} onChange={(e) => set('name', e.target.value)} />
        </label>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Who</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {(['student', 'mentor'] as const).map((role) => (
              <label key={role} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.roles.includes(role)}
                  onChange={(e) => set('roles', e.target.checked ? [...r.roles, role] : r.roles.filter((x) => x !== role))}
                  className="accent-[var(--color-primary)]"
                />
                {role === 'student' ? 'Learners' : 'Mentors'}
              </label>
            ))}
            <span className="text-xs text-muted self-center">Admins are never included.</span>
          </div>
          <select
            multiple
            className="input min-h-24 text-sm"
            value={r.programIds}
            onChange={(e) => set('programIds', Array.from(e.target.selectedOptions).map((o) => o.value))}
            aria-label="Limit to programs"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">{r.programIds.length ? `Only ${r.programIds.length} selected program(s).` : 'All programs (hold Ctrl/⌘ to pick specific ones).'}</p>
          <label className="flex items-center gap-2 text-sm">
            Skip accounts newer than
            <input type="number" min={0} max={365} className="input h-9 w-20" value={r.newAccountDays} onChange={(e) => set('newAccountDays', Math.max(0, Math.min(365, Number(e.target.value) || 0)))} />
            days
          </label>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Counts as inactive when…</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            <DaysCheck label="No sign-in" value={r.noLoginDays} onChange={(v) => set('noLoginDays', v)} hint="Never signed in counts from account creation." />
            <DaysCheck label="No submissions" value={r.noSubmissionDays} onChange={(v) => set('noSubmissionDays', v)} hint="Only if work was due in that time." />
            <DaysCheck label="No attendance" value={r.noAttendanceDays} onChange={(v) => set('noAttendanceDays', v)} hint="Only if sessions happened." />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Match when</span>
            <select className="input h-9 w-auto" value={r.combine} onChange={(e) => set('combine', e.target.value as 'any' | 'all')}>
              <option value="any">any check is true</option>
              <option value="all">all checks are true</option>
            </select>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">What happens</h3>
          <Toggle checked={r.remind} onChange={(v) => set('remind', v)} label="Send a friendly reminder" description="In-app notification and email to the person." />
          <Toggle checked={r.flag} onChange={(v) => set('flag', v)} label="Flag for review" description="Admins (and their mentors) are told; the person gets a heads-up." />
          {r.flag && r.remind && (
            <label className="flex items-center gap-2 text-sm pl-1">
              Flag
              <input type="number" min={0} max={180} className="input h-9 w-20" value={r.flagAfterDays} onChange={(e) => set('flagAfterDays', Math.max(0, Math.min(180, Number(e.target.value) || 0)))} />
              days after the reminder if nothing changes
            </label>
          )}
          <Toggle
            checked={r.suspend}
            onChange={(v) => set('suspend', v && r.flag)}
            disabled={!r.flag}
            label="Pause the account"
            description="Signs them out and blocks sign-in until an admin reactivates them. Nothing is deleted. Needs “Flag for review”."
          />
          {r.suspend && (
            <div className="grid sm:grid-cols-2 gap-2 pl-1">
              <label className="flex items-center gap-2 text-sm">
                Grace period
                <input type="number" min={1} max={365} className="input h-9 w-20" value={r.graceDays} onChange={(e) => set('graceDays', Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                days
              </label>
              <label className="flex items-center gap-2 text-sm">
                Pause at most
                <input type="number" min={1} max={500} className="input h-9 w-20" value={r.maxSuspendPerRun} onChange={(e) => set('maxSuspendPerRun', Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
                per run
              </label>
            </div>
          )}
          <Toggle checked={r.notifyMentors} onChange={(v) => set('notifyMentors', v)} label="Tell mentors about their flagged learners" />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select className="input h-9 w-auto" value={r.frequency} onChange={(e) => set('frequency', e.target.value as 'daily' | 'weekly')}>
              <option value="daily">Every day</option>
              <option value="weekly">Every Monday</option>
            </select>
            <span className="text-xs text-muted">Runs with the daily maintenance job (about 03:00 UTC).</span>
          </div>
          <Toggle checked={r.enabled} onChange={(v) => set('enabled', v)} label="Rule is on" description="Off = only previews and dry runs. Try a preview first." />
        </section>

        {err && (
          <p role="alert" className="text-sm text-danger">
            {err}
          </p>
        )}

        {preview && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Preview</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="muted">{preview.counts.checked} checked</Badge>
              <Badge tone="primary">{preview.counts.matched} match</Badge>
              <Badge tone="primary">{preview.counts.remind} reminder</Badge>
              <Badge tone="warning">{preview.counts.flag} flag</Badge>
              <Badge tone="danger">{preview.counts.suspend} pause</Badge>
              {preview.cleared > 0 && <Badge tone="success">{preview.cleared} active again</Badge>}
            </div>
            <PreviewTable rows={preview.rows} />
          </section>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function RulesPanel({ rules, programs, canConfigure, canRun }: { rules: Rule[]; programs: ProgramOpt[]; canConfigure: boolean; canRun: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const sudo = useSudo();
  const [editing, setEditing] = useState<{ id?: string; rule: RuleInput } | null>(null);
  const [preview, setPreview] = useState<{ name: string; rows: EvalRow[]; counts: Record<string, number> } | null>(null);
  const [busy, setBusy] = useState('');

  async function run(rule: Rule, mode: 'dry' | 'live') {
    if (mode === 'live') {
      const ok = await confirm({
        title: `Run “${rule.name}” now?`,
        body: 'Reminders, flags and pauses happen right away, exactly as the daily schedule would do them.',
        confirmLabel: 'Run now',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusy(rule.id + mode);
    const r = await sudo(() => runRuleAction({ id: rule.id, mode }));
    setBusy('');
    if (r.ok) {
      const c = r.counts as Record<string, number>;
      toast.success(
        mode === 'dry'
          ? `Dry run: ${c.matched} match · would remind ${c.remind}, flag ${c.flag}, pause ${c.suspend}. Nothing was changed.`
          : `Done: ${c.reminded ?? 0} reminded, ${c.flagged ?? 0} flagged, ${c.suspended ?? 0} paused${r.partial ? ' (continues next run)' : ''}.`
      );
      router.refresh();
    } else if (r.error !== 'Cancelled') toast.error(r.error);
  }

  async function quickPreview(rule: Rule) {
    setBusy(rule.id + 'preview');
    const r = await previewRuleAction({ id: rule.id });
    setBusy('');
    if (r.ok) setPreview({ name: rule.name, rows: r.rows, counts: r.counts });
    else toast.error(r.error);
  }

  async function remove(rule: Rule) {
    const ok = await confirm({
      title: `Delete “${rule.name}”?`,
      body: 'Open reminders and flags from this rule are closed. Accounts it paused stay paused until an admin reactivates them.',
      tone: 'danger',
      confirmLabel: 'Delete rule',
    });
    if (!ok) return;
    const r = await sudo(() => deleteRuleAction({ id: rule.id }));
    if (r.ok) {
      toast.success('Rule deleted.');
      router.refresh();
    } else if (r.error !== 'Cancelled') toast.error(r.error);
  }

  return (
    <div className="space-y-4">
      {canConfigure && (
        <div className="flex justify-end">
          <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => setEditing({ rule: DEFAULT_RULE })}>
            <NavIcon name="plus" size={16} /> New rule
          </button>
        </div>
      )}

      {rules.length === 0 ? (
        <Panel>
          <EmptyNote
            icon={<NavIcon name="automation" />}
            title="No automation rules yet"
            text={canConfigure ? 'Start with a gentle rule: remind learners who have not signed in for 30 days, then flag them for review.' : 'The Super Admin has not set up any rules.'}
            action={
              canConfigure ? (
                <button type="button" className="btn-primary" onClick={() => setEditing({ rule: DEFAULT_RULE })}>
                  Create the first rule
                </button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <ul className="grid gap-3">
          {rules.map((rule) => (
            <li key={rule.id} className="bg-surface border border-border rounded-[var(--radius-lg)] p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{rule.name}</h3>
                    {rule.enabled ? <Badge tone="success" dot>on</Badge> : <Badge tone="muted" dot>off</Badge>}
                    {rule.suspend && <Badge tone="danger">can pause</Badge>}
                    <span className="text-xs text-muted">{rule.frequency === 'weekly' ? 'weekly' : 'daily'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{describe(rule)}</p>
                  <p className="mt-1 text-xs text-muted">{rule.lastRunAt ? `Last run ${formatRelative(rule.lastRunAt)}` : 'Not run yet'}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button type="button" className="btn-outline h-9 px-3 text-sm" disabled={!!busy} onClick={() => quickPreview(rule)}>
                    {busy === rule.id + 'preview' ? 'Checking…' : 'Preview'}
                  </button>
                  {canConfigure && (
                    <>
                      <button type="button" className="btn-outline h-9 px-3 text-sm" disabled={!!busy} onClick={() => run(rule, 'dry')}>
                        {busy === rule.id + 'dry' ? 'Running…' : 'Dry run'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline h-9 px-3 text-sm"
                        onClick={() => {
                          const { id: _id, lastRunAt: _l, updatedAt: _u, ...input } = rule;
                          void _id;
                          void _l;
                          void _u;
                          setEditing({ id: rule.id, rule: input });
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )}
                  {canRun && (
                    <button type="button" className="btn-primary h-9 px-3 text-sm" disabled={!!busy} onClick={() => run(rule, 'live')}>
                      {busy === rule.id + 'live' ? 'Running…' : 'Run now'}
                    </button>
                  )}
                  {canConfigure && (
                    <button type="button" className="btn-ghost h-9 px-2 text-sm text-danger" onClick={() => remove(rule)} aria-label={`Delete ${rule.name}`}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <RuleEditor open onClose={() => setEditing(null)} initial={editing.rule} ruleId={editing.id} programs={programs} />}

      <Modal open={!!preview} onClose={() => setPreview(null)} size="lg" title={`Who “${preview?.name ?? ''}” matches`} description="Nothing is changed by a preview.">
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="muted">{preview.counts.checked} checked</Badge>
              <Badge tone="primary">{preview.counts.matched} match</Badge>
              <Badge tone="warning">{preview.counts.flag} to flag</Badge>
              <Badge tone="danger">{preview.counts.suspend} to pause</Badge>
              <Badge tone="muted">{preview.counts.skipped} skipped (admins, exempt, new)</Badge>
            </div>
            <PreviewTable rows={preview.rows} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

const STAGE_TONE = { reminded: 'primary', flagged: 'warning', suspended: 'danger', resolved: 'success' } as const;

export function ReviewPanel({
  flags,
  stage,
  canReview,
  exempt,
}: {
  flags: FlagRow[];
  stage: 'review' | 'reminded' | 'resolved';
  canReview: boolean;
  exempt: { id: string; name: string; email: string; role: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  async function act(f: FlagRow, resolution: 'reactivated' | 'exempted' | 'dismissed') {
    const text = {
      reactivated: { t: `Reactivate ${f.name}?`, b: 'They can sign in again right away and get a welcome-back notice.' },
      exempted: { t: `Exempt ${f.name} from automation?`, b: f.stage === 'suspended' ? 'They are reactivated and no rule will touch them again until you remove the exemption.' : 'No rule will touch them again until you remove the exemption.' },
      dismissed: { t: `Dismiss this flag?`, b: 'The flag is closed. If they stay inactive, the rule starts again from the reminder.' },
    }[resolution];
    if (!(await confirm({ title: text.t, body: text.b, confirmLabel: 'Confirm' }))) return;
    start(async () => {
      const r = await resolveFlagAction({ id: f.id, resolution });
      if (r.ok) {
        toast.success('Done.');
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Flag stage">
        {(
          [
            ['review', 'Needs review'],
            ['reminded', 'Reminded'],
            ['resolved', 'Resolved'],
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/automation?tab=flags&stage=${id}`}
            role="tab"
            aria-selected={stage === id}
            className={`h-8 px-3 inline-flex items-center rounded-full border text-xs font-medium transition-colors ${
              stage === id ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <DataTable
        rows={flags}
        rowKey={(f) => f.id}
        caption="Automation flags"
        searchText={(f) => `${f.name} ${f.email} ${f.ruleName}`}
        searchPlaceholder="Search people…"
        empty={stage === 'review' ? 'Nothing needs review. 🎉' : 'Nothing here.'}
        columns={[
          {
            key: 'name',
            header: 'Person',
            sort: (f) => f.name.toLowerCase(),
            cell: (f) => (
              <Link href={`/admin/users/${f.userId}`} className="block min-w-0 group">
                <span className="block font-medium truncate group-hover:underline">{f.name}</span>
                <span className="block text-xs text-muted truncate">{f.reasons.join(' · ') || f.email}</span>
              </Link>
            ),
          },
          { key: 'rule', header: 'Rule', hideOnMobile: true, cell: (f) => <span className="text-xs text-muted">{f.ruleName}</span> },
          {
            key: 'stage',
            header: 'Status',
            sort: (f) => f.stage,
            cell: (f) => (
              <Badge tone={STAGE_TONE[f.stage]} dot>
                {f.stage === 'suspended' ? 'paused' : f.stage === 'resolved' ? f.resolution || 'resolved' : f.stage}
              </Badge>
            ),
          },
          { key: 'at', header: 'Since', hideOnMobile: true, sort: (f) => new Date(f.at).getTime(), cell: (f) => <span className="text-xs" title={formatDateTime(f.at)}>{formatDate(f.at)}</span> },
          {
            key: 'act',
            header: '',
            cell: (f) =>
              canReview && f.stage !== 'resolved' ? (
                <span className="flex flex-wrap gap-1.5 justify-end">
                  {f.stage === 'suspended' && (
                    <button type="button" className="btn-primary h-8 px-3 text-xs" disabled={pending} onClick={() => act(f, 'reactivated')}>
                      Reactivate
                    </button>
                  )}
                  <button type="button" className="btn-outline h-8 px-3 text-xs" disabled={pending} onClick={() => act(f, 'exempted')}>
                    Exempt
                  </button>
                  {f.stage !== 'suspended' && (
                    <button type="button" className="btn-ghost h-8 px-3 text-xs" disabled={pending} onClick={() => act(f, 'dismissed')}>
                      Dismiss
                    </button>
                  )}
                </span>
              ) : f.resolvedNote ? (
                <span className="text-xs text-muted italic">{f.resolvedNote}</span>
              ) : null,
          },
        ]}
      />

      <Panel title={`Exempt accounts (${exempt.length})`} icon={<NavIcon name="shield" size={16} />} bodyClassName="p-0">
        {exempt.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nobody is exempt. Exempt people are never reminded, flagged or paused.</p>
        ) : (
          <ul className="divide-y divide-border">
            {exempt.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{u.name}</span>
                  <span className="block text-xs text-muted truncate">{u.email}</span>
                </span>
                {canReview && (
                  <button
                    type="button"
                    className="btn-ghost h-8 px-2.5 text-xs"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await setExemptAction({ userId: u.id, exempt: false });
                        if (r.ok) {
                          toast.success('Exemption removed.');
                          router.refresh();
                        } else toast.error(r.error);
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export function HistoryPanel({ runs }: { runs: RunRow[] }) {
  const n = (v: unknown) => (typeof v === 'number' ? v : 0);
  return (
    <DataTable
      rows={runs}
      rowKey={(r) => r.id}
      caption="Automation runs"
      empty="No runs yet. Rules run once a day with the maintenance job."
      columns={[
        { key: 'when', header: 'When', sort: (r) => new Date(r.startedAt).getTime(), cell: (r) => <span className="text-sm">{formatDateTime(r.startedAt)}</span> },
        { key: 'what', header: 'Job', cell: (r) => <span className="text-sm">{r.job === 'automation' ? r.ruleName : r.job}</span> },
        { key: 'mode', header: 'Mode', cell: (r) => (r.mode === 'dry' ? <Badge tone="muted">dry run</Badge> : <Badge tone="primary">live</Badge>) },
        { key: 'by', header: 'By', hideOnMobile: true, cell: (r) => <span className="text-xs text-muted">{r.byName}</span> },
        {
          key: 'result',
          header: 'Result',
          cell: (r) =>
            !r.ok ? (
              <span className="text-xs text-danger">{r.error || 'failed'}</span>
            ) : r.job === 'automation' ? (
              <span className="text-xs">
                {n(r.counts.matched)} matched
                {r.mode === 'live' ? ` · ${n(r.counts.reminded)} reminded · ${n(r.counts.flagged)} flagged · ${n(r.counts.suspended)} paused` : ` · would pause ${n(r.counts.suspend)}`}
                {r.counts.partial ? ' · partial' : ''}
              </span>
            ) : (
              <span className="text-xs text-muted">
                {Object.entries(r.counts)
                  .filter(([, v]) => typeof v === 'number')
                  .map(([k, v]) => `${k} ${v}`)
                  .join(' · ')}
              </span>
            ),
        },
      ]}
    />
  );
}
