// =============================================================================
// FILE: app/(app)/admin/security/actions.ts   (NEW FILE)
// Royal-only security actions + Super Admin management.
// High-impact actions require a recent identity confirmation (lib/sudo.ts):
// they answer REAUTH_REQUIRED and the page asks for the password, then retries.
// =============================================================================

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import { revokeAllSessions, setSuperAdmin } from '@/lib/users';
import { audit } from '@/lib/audit';
import { requireRecentAuth, REAUTH_REQUIRED } from '@/lib/sudo';
import { computeSuper, orgHasSuper, invalidateOrgSuper } from '@/lib/super';
import { db } from '@/lib/db';
import User from '@/models/User';

type Result = { ok: true } | { ok: false; error: string };

/** Live Super Admin check from the database (never trusts the session cache). */
async function isSuperLive(admin: { id: string; orgId: string }): Promise<boolean> {
  await db();
  const u = (await User.findOne({ _id: admin.id, orgId: admin.orgId }).select('role status email superAdmin').lean()) as
    | { role: string; status: string; email: string; superAdmin?: boolean }
    | null;
  if (!u) return false;
  const royal = await isRoyal(admin as never);
  return computeSuper({ orgId: admin.orgId, role: u.role, status: u.status, email: u.email, superAdmin: u.superAdmin, royal });
}

/** Grant / remove Super Admin. Super Admins only; never your own; needs re-auth. */
export async function setSuperAction(raw: unknown): Promise<Result> {
  const admin = await requireRole('admin');
  const parsed = z.object({ id: z.string().min(1).max(40), value: z.boolean() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  if (!(await isSuperLive(admin))) return { ok: false, error: 'Only a Super Admin can do this.' };
  if (parsed.data.id === admin.id) return { ok: false, error: "You can't change your own Super Admin status." };
  if (!(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  const r = await setSuperAdmin(admin.orgId, parsed.data.id, parsed.data.value);
  if (!r.ok) return r;
  const t = (await User.findOne({ _id: parsed.data.id, orgId: admin.orgId }).select('name email').lean()) as { name?: string; email?: string } | null;
  await audit({
    orgId: admin.orgId,
    action: parsed.data.value ? 'security.super_granted' : 'security.super_revoked',
    actorId: admin.id,
    actorEmail: admin.email ?? '',
    actorName: admin.name ?? '',
    targetIds: [parsed.data.id],
    summary: `${t?.name ?? 'Admin'} <${t?.email ?? ''}>`,
  });
  revalidatePath('/admin/security');
  return { ok: true };
}

/** Bootstrap: while no Super Admin exists, a royal admin can claim it. Needs re-auth. */
export async function claimSuperAction(): Promise<Result> {
  const admin = await requireRole('admin');
  if (!(await isRoyal(admin))) return { ok: false, error: 'Only a royal admin can do this.' };
  await invalidateOrgSuper(admin.orgId);
  if (await orgHasSuper(admin.orgId)) return { ok: false, error: 'A Super Admin already exists. Ask them to grant you access.' };
  if (!(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  const r = await setSuperAdmin(admin.orgId, admin.id, true);
  if (!r.ok) return r;
  await audit({
    orgId: admin.orgId,
    action: 'security.super_claimed',
    actorId: admin.id,
    actorEmail: admin.email ?? '',
    actorName: admin.name ?? '',
    targetIds: [admin.id],
    summary: 'First Super Admin (claimed during setup)',
  });
  revalidatePath('/admin/security');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function emergencySignOutAction(
  raw: unknown
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = await requireRole('admin');
  if (!(await isRoyal(admin))) return { ok: false, error: 'Only a royal admin can do this.' };
  const parsed = z.object({ confirm: z.string() }).safeParse(raw);
  if (!parsed.success || parsed.data.confirm.trim().toUpperCase() !== 'SIGN OUT EVERYONE') {
    return { ok: false, error: 'Type SIGN OUT EVERYONE to confirm.' };
  }
  if (!(await requireRecentAuth(admin))) return { ok: false, error: REAUTH_REQUIRED };
  const count = await revokeAllSessions(admin.orgId, admin.id);
  await audit({
    orgId: admin.orgId,
    action: 'security.emergency_signout',
    actorId: admin.id,
    actorEmail: admin.email ?? '',
    actorName: admin.name ?? '',
    summary: `Signed out ${count} account${count === 1 ? '' : 's'} on every device`,
  });
  revalidatePath('/admin/security');
  return { ok: true, count };
}
