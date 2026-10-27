'use server';

// =============================================================================
// FILE: app/(app)/admin/premium/actions.ts   (NEW FILE)
// Admin → Premium: grant / extend / revoke memberships, program-wide grants,
// redeemable codes. Permissions (lib/rbac.ts, delegable by the Super Admin):
//   premium.grant  — grant / extend / revoke   (Royal Admin by default)
//   premium.codes  — create / disable codes    (Royal Admin by default)
// Program-wide grants need a recent identity confirmation. All audited.
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { requireRole, hasPermission } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { grantPremium, grantPremiumToProgram, revokePremium, createCodes, disableCode } from '@/lib/premium';
import { requireRecentAuth, REAUTH_REQUIRED } from '@/lib/sudo';
import { db } from '@/lib/db';
import User from '@/models/User';

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id');
const days = z.number().int().min(0).max(3650);

async function gate(perm: 'premium.grant' | 'premium.codes') {
  const admin = await requireRole('admin');
  if (!(await hasPermission(admin, perm))) return { admin, error: 'You do not have permission to do this.' };
  const s = await getSettings();
  if (!s.premiumEnabled) return { admin, error: 'Premium is switched off in Settings → Premium.' };
  return { admin, error: null };
}

export async function grantPremiumAction(raw: unknown): Promise<Res<{ changed: number }>> {
  const { admin, error } = await gate('premium.grant');
  if (error) return { ok: false, error };
  const p = z
    .object({
      userIds: z.array(id).max(1000).default([]),
      programId: id.optional(),
      includeMentors: z.boolean().default(false),
      days,
      mode: z.enum(['extend', 'set']).default('extend'),
      note: z.string().trim().max(300).default(''),
      notify: z.boolean().default(true),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: 'Check the form and try again.' };
  const d = p.data;
  if (d.programId) {
    if (!(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
    const r = await grantPremiumToProgram(admin, d.programId, { days: d.days, mode: d.mode, note: d.note, notifyUsers: d.notify, includeMentors: d.includeMentors });
    revalidatePath('/admin/premium');
    return { ok: true, changed: r.changed };
  }
  if (!d.userIds.length) return { ok: false, error: 'Choose at least one person.' };
  const r = await grantPremium(admin, { userIds: d.userIds, days: d.days, mode: d.mode, note: d.note, notifyUsers: d.notify });
  revalidatePath('/admin/premium');
  return { ok: true, changed: r.changed };
}

export async function revokePremiumAction(raw: unknown): Promise<Res<{ changed: number }>> {
  const { admin, error } = await gate('premium.grant');
  if (error) return { ok: false, error };
  const p = z.object({ userIds: z.array(id).min(1).max(1000), note: z.string().trim().max(300).default('') }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Choose at least one person.' };
  const r = await revokePremium(admin, p.data.userIds, p.data.note);
  revalidatePath('/admin/premium');
  return { ok: true, changed: r.changed };
}

export async function createCodesAction(raw: unknown): Promise<Res<{ codes: string[] }>> {
  const { admin, error } = await gate('premium.codes');
  if (error) return { ok: false, error };
  const p = z
    .object({
      count: z.number().int().min(1).max(200),
      days,
      maxUses: z.number().int().min(1).max(10000),
      expiresAt: z.string().max(40).optional().default(''),
      programId: z.union([id, z.literal('')]).optional().default(''),
      label: z.string().trim().max(80).default(''),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: 'Check the form and try again.' };
  let expiresAt: Date | null = null;
  if (p.data.expiresAt) {
    const d = new Date(p.data.expiresAt);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return { ok: false, error: 'The code end date must be in the future.' };
    expiresAt = d;
  }
  const codes = await createCodes(admin, { ...p.data, expiresAt, programId: p.data.programId || null });
  revalidatePath('/admin/premium');
  return { ok: true, codes };
}

export async function disableCodeAction(raw: unknown): Promise<Res> {
  const { admin, error } = await gate('premium.codes');
  if (error) return { ok: false, error };
  const p = z.object({ id }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid code' };
  await disableCode(admin, p.data.id);
  revalidatePath('/admin/premium');
  return { ok: true };
}

/** People picker for the grant dialog (learners and mentors). */
export async function findPeopleAction(q: string): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const admin = await requireRole('admin');
  if (!(await hasPermission(admin, 'premium.grant'))) return [];
  const term = String(q ?? '').trim().slice(0, 60);
  if (term.length < 2) return [];
  await db();
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const rows = (await User.find({ orgId: admin.orgId, role: { $in: ['student', 'mentor'] }, $or: [{ name: rx }, { email: rx }, { memberId: rx }] })
    .select('name email role')
    .limit(12)
    .lean()) as { _id: unknown; name: string; email: string; role: string }[];
  return rows.map((r) => ({ id: String(r._id), name: r.name, email: r.email, role: r.role }));
}

// ---------------------------------------------------------------------------
// Plans (Super Admin: premium.policy)
// ---------------------------------------------------------------------------

export async function savePlanAction(raw: unknown): Promise<Res<{ id: string }>> {
  const admin = await requireRole('admin');
  if (!(await hasPermission(admin, 'premium.policy'))) return { ok: false, error: 'Only a Super Admin can change plans.' };
  const p = z
    .object({
      id: id.optional(),
      plan: z.object({
        name: z.string().trim().min(1, 'Give the plan a name').max(60),
        description: z.string().max(500).default(''),
        days,
        tokenPrice: z.number().int().min(0).max(10_000_000),
        priceLabel: z.string().trim().max(40).default(''),
        highlight: z.boolean().default(false),
        active: z.boolean().default(true),
        sort: z.number().int().min(-1000).max(1000).default(0),
      }),
    })
    .safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the plan' };
  const { savePlan } = await import('@/lib/premium-plans');
  const plan = await savePlan(admin, p.data.plan, p.data.id);
  revalidatePath('/admin/premium');
  revalidatePath('/premium');
  return { ok: true, id: plan.id };
}
