'use server';

// =============================================================================
// FILE: app/(app)/admin/automation/actions.ts   (NEW FILE)
// Inactive-account automation. Permissions (lib/rbac.ts):
//   automation.view       preview who matches             (Program Admin+)
//   automation.review     reactivate / exempt / dismiss    (Program Admin+, delegable)
//   automation.configure  create / edit / delete rules, dry runs   (Super Admin)
//   automation.run        run live now                     (Super Admin)
// Turning on suspension, deleting rules and live runs need a recent
// identity confirmation.
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireRole, hasPermission } from '@/lib/auth-helpers';
import { saveRule, deleteRule, getRule, evaluateRule, runRule, resolveFlag, setExempt, type Rule, type EvalRow } from '@/lib/automation';
import { requireRecentAuth, REAUTH_REQUIRED } from '@/lib/sudo';
import { hit } from '@/lib/rate-limit';

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id');
const days = z.number().int().min(0).max(730);

const ruleSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the rule a name').max(80),
    enabled: z.boolean(),
    roles: z.array(z.enum(['student', 'mentor'])).min(1, 'Choose who it applies to').max(2),
    programIds: z.array(id).max(200).default([]),
    noLoginDays: days,
    noSubmissionDays: days,
    noAttendanceDays: days,
    combine: z.enum(['any', 'all']),
    newAccountDays: z.number().int().min(0).max(365),
    remind: z.boolean(),
    flag: z.boolean(),
    flagAfterDays: z.number().int().min(0).max(180),
    suspend: z.boolean(),
    graceDays: z.number().int().min(1).max(365),
    notifyMentors: z.boolean(),
    maxSuspendPerRun: z.number().int().min(1).max(500),
    frequency: z.enum(['daily', 'weekly']),
  })
  .refine((r) => r.noLoginDays + r.noSubmissionDays + r.noAttendanceDays > 0, 'Turn on at least one inactivity check')
  .refine((r) => r.remind || r.flag || r.suspend, 'Choose at least one action')
  .refine((r) => !r.suspend || r.flag, 'Suspension needs “flag for review” first, so an admin always gets a chance to look');

async function gate(perm: 'automation.view' | 'automation.review' | 'automation.configure' | 'automation.run') {
  const admin = await requireRole('admin');
  return { admin, allowed: await hasPermission(admin, perm) };
}

export async function saveRuleAction(raw: unknown): Promise<Res<{ id: string }>> {
  const { admin, allowed } = await gate('automation.configure');
  if (!allowed) return { ok: false, error: 'Only a Super Admin can change automation rules.' };
  const p = z.object({ id: id.optional(), rule: ruleSchema }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form' };
  const prev = p.data.id ? await getRule(admin.orgId, p.data.id) : null;
  // Turning on (or enabling a rule that) can suspend accounts needs re-auth.
  const riskier = p.data.rule.suspend && p.data.rule.enabled && (!prev || !prev.suspend || !prev.enabled);
  if (riskier && !(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  const r = await saveRule(admin, p.data.rule, p.data.id);
  revalidatePath('/admin/automation');
  return { ok: true, id: r.id };
}

export async function deleteRuleAction(raw: unknown): Promise<Res> {
  const { admin, allowed } = await gate('automation.configure');
  if (!allowed) return { ok: false, error: 'Only a Super Admin can delete rules.' };
  const p = z.object({ id }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid rule' };
  if (!(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  await deleteRule(admin, p.data.id);
  revalidatePath('/admin/automation');
  return { ok: true };
}

export type PreviewResult = Res<{ rows: EvalRow[]; counts: Record<string, number>; cleared: number }>;

/** Who would be affected — works for saved rules and unsaved drafts. No writes. */
export async function previewRuleAction(raw: unknown): Promise<PreviewResult> {
  const { admin, allowed } = await gate('automation.view');
  if (!allowed) return { ok: false, error: 'Not allowed' };
  if ((await hit(`automation-preview:${admin.id}`, 60)) > 20) return { ok: false, error: 'Please wait a moment before previewing again.' };
  const p = z.object({ id: id.optional(), rule: ruleSchema.optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form' };
  let rule: Rule | null = null;
  if (p.data.rule) rule = { ...p.data.rule, id: p.data.id ?? 'draft', lastRunAt: null, updatedAt: new Date().toISOString() };
  else if (p.data.id) rule = await getRule(admin.orgId, p.data.id);
  if (!rule) return { ok: false, error: 'Rule not found' };
  const ev = await evaluateRule(admin.orgId, rule);
  return { ok: true, rows: ev.rows.slice(0, 500), counts: ev.counts, cleared: ev.cleared.length };
}

export async function runRuleAction(raw: unknown): Promise<Res<{ counts: Record<string, number | boolean>; partial: boolean }>> {
  const p = z.object({ id, mode: z.enum(['dry', 'live']) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid request' };
  const { admin, allowed } = await gate(p.data.mode === 'live' ? 'automation.run' : 'automation.configure');
  if (!allowed) return { ok: false, error: 'Only a Super Admin can run automation.' };
  if (p.data.mode === 'live' && !(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  if ((await hit(`automation-run:${admin.id}`, 300)) > 5) return { ok: false, error: 'Too many runs — wait a few minutes.' };
  const rule = await getRule(admin.orgId, p.data.id);
  if (!rule) return { ok: false, error: 'Rule not found' };
  const r = await runRule(admin.orgId, rule, p.data.mode, { id: admin.id, name: admin.name ?? admin.email ?? 'Admin' }, Date.now() + 8000);
  revalidatePath('/admin/automation');
  return { ok: true, counts: r.counts, partial: r.partial };
}

export async function resolveFlagAction(raw: unknown): Promise<Res> {
  const { admin, allowed } = await gate('automation.review');
  if (!allowed) return { ok: false, error: 'You do not have permission to review flags.' };
  const p = z.object({ id, resolution: z.enum(['reactivated', 'exempted', 'dismissed']), note: z.string().trim().max(300).default('') }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid request' };
  const r = await resolveFlag(admin, p.data.id, p.data.resolution, p.data.note);
  if (r.ok) revalidatePath('/admin/automation');
  return r;
}

export async function setExemptAction(raw: unknown): Promise<Res> {
  const { admin, allowed } = await gate('automation.review');
  if (!allowed) return { ok: false, error: 'You do not have permission to change exemptions.' };
  const p = z.object({ userId: id, exempt: z.boolean() }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid request' };
  const r = await setExempt(admin, p.data.userId, p.data.exempt);
  if (r.ok) {
    revalidatePath('/admin/automation');
    revalidatePath(`/admin/users/${p.data.userId}`);
  }
  return r;
}
