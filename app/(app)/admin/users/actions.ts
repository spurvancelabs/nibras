// =============================================================================
// FILE: app/(app)/admin/users/actions.ts
// Server actions for user management (admin only).
// NEW in this version:
//   - every change is written to the audit log (who, what, when, IP)
//   - password policy (min 8) everywhere; avatar must be an http(s) URL
//   - granting the ADMIN role needs an explicit confirmation flag
//   - welcome emails are sent with after(), so they finish after the response
//     instead of being cut off on Vercel; links use the configured app URL
//   - revokeSessionsAction: sign users out of every device
//   - previewAssignMemberIdsAction / assignMemberIdsAction: give everyone
//     without a member ID the next number (the "Assign member IDs" button)
// =============================================================================

'use server';

import { z } from 'zod';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireRole, isRoyal } from '@/lib/auth-helpers';
import {
  createUser,
  updateUser,
  setUserPrograms,
  deleteUsers,
  bulkUpdateUsers,
  nextMemberIds,
  revokeSessions,
  previewMissingMemberIds,
  assignMissingMemberIds,
  type AssignPreview,
  getRoleInfo,
  setRoyal,
} from '@/lib/users';
import { orgHasRoyal, invalidateOrgRoyal } from '@/lib/royal';
import { getSettings, updateSettings } from '@/lib/settings';
import { validateMemberIdFormat, normalizeMemberId } from '@/lib/member-id';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/password';
import { appOrigin } from '@/lib/request-info';
import { audit } from '@/lib/audit';
import { ROLES } from '@/models/User';

const memberIdField = z.string().max(40, 'Member ID must be 40 characters or fewer');
const idField = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid user');
const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: passwordField,
  role: z.enum(ROLES),
  avatar: z.string().max(500).optional().default(''),
  memberId: memberIdField.optional().default(''),
  sendEmail: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  id: idField,
  name: z.string().min(1).max(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  avatar: z.string().max(500).optional(),
  password: passwordField.optional(),
  memberId: memberIdField.optional(),
});

const programsSchema = z.object({
  id: idField,
  programIds: z.array(z.string().max(24)).max(200).default([]),
});

const idsSchema = z.object({
  ids: z.array(idField).min(1, 'Select at least one user').max(500),
});

const bulkSchema = idsSchema.extend({
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(ROLES).optional(),
  confirmAdmin: z.boolean().optional(),
});

const rulesSchema = z.object({
  memberIdRequired: z.boolean().optional(),
  memberIdFormat: z.string().max(40).optional(),
});

const assignSchema = z.object({
  format: z.string().max(40).optional(),
  role: z.enum(ROLES).optional(),
  ids: z.array(idField).max(5000).optional(),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

type Admin = { id: string; orgId: string; email?: string | null; name?: string | null; role?: string };

const ROYAL_ONLY = 'Only a royal admin can manage admin accounts or grant admin access.';

function actor(admin: Admin) {
  return {
    orgId: admin.orgId,
    actorId: admin.id,
    actorEmail: admin.email ?? '',
    actorName: admin.name ?? '',
  };
}

function revalidateUsers(id?: string) {
  revalidatePath('/admin/users');
  if (id) revalidatePath(`/admin/users/${id}`);
}

function firstIssue(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Invalid input';
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createUserAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const settings = await getSettings();
  const memberId = normalizeMemberId(parsed.data.memberId);
  if (settings.memberIdRequired && !memberId) {
    return { ok: false, error: 'Member ID is required (change this in Settings → Members)' };
  }

  const { sendEmail: shouldEmail, ...data } = parsed.data;
  if (data.role === 'admin' && !(await isRoyal(admin as never))) return { ok: false, error: ROYAL_ONLY };
  const res = await createUser({ orgId: admin.orgId, ...data, memberId });
  if (!res.ok) return res;

  await audit({
    ...actor(admin),
    action: 'user.create',
    targetIds: [res.id],
    summary: `${data.name} <${data.email}> as ${data.role}${memberId ? ` · ${memberId}` : ''}`,
    meta: { role: data.role, memberId, emailed: shouldEmail },
  });

  if (shouldEmail) {
    const origin = await appOrigin();
    // Runs after the response is sent, but is guaranteed to finish.
    after(async () => {
      try {
        const { sendEmail } = await import('@/lib/email');
        const ok = await sendEmail({
          to: data.email,
          subject: `Your ${settings.orgName} account`,
          heading: `Welcome to ${settings.orgName}`,
          body:
            `Hi ${data.name},\n\n` +
            `An account has been created for you.\n\n` +
            (memberId ? `Member ID: ${memberId}\n` : '') +
            `Email: ${data.email}\n` +
            `Temporary password: ${data.password}\n\n` +
            `Please sign in and change your password from your profile.`,
          link: `${origin}/login`,
          ctaLabel: 'Sign in',
        });
        if (!ok) {
          await audit({
            ...actor(admin),
            action: 'user.welcome_emails',
            targetIds: [res.id],
            summary: `Welcome email to ${data.email} FAILED`,
            meta: { sent: 0, failed: 1 },
            ip: '',
          });
        }
      } catch (e) {
        console.error('[createUserAction] welcome email failed', e);
      }
    });
  }

  revalidateUsers();
  return { ok: true, id: res.id };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateUserAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { id, ...patch } = parsed.data;

  // Protect the acting admin from locking themselves out
  if (id === admin.id) {
    if (patch.status === 'disabled') return { ok: false, error: "You can't disable your own account" };
    if (patch.role && patch.role !== 'admin') return { ok: false, error: "You can't remove your own admin role" };
  }

  if (patch.memberId !== undefined) {
    const settings = await getSettings();
    if (settings.memberIdRequired && !normalizeMemberId(patch.memberId)) {
      return { ok: false, error: 'Member ID is required (change this in Settings → Members)' };
    }
  }

  // Admin accounts (and granting admin) are royal-only.
  const target = (await getRoleInfo(admin.orgId, [id])).get(id);
  if (!target) return { ok: false, error: 'User not found' };
  if (id !== admin.id && (target.role === 'admin' || patch.role === 'admin') && !(await isRoyal(admin as never))) {
    return { ok: false, error: ROYAL_ONLY };
  }

  const res = await updateUser(admin.orgId, id, patch);
  if (!res.ok) return res;

  const c = res.changes;
  if (c.password) {
    await audit({
      ...actor(admin),
      action: 'user.password_reset',
      targetIds: [id],
      summary: 'Password set by admin · signed out on all devices',
    });
  }
  const parts: string[] = [];
  if (c.name) parts.push(`name "${c.name.from}" → "${c.name.to}"`);
  if (c.role) parts.push(`role ${c.role.from} → ${c.role.to}`);
  if (c.status) parts.push(`status ${c.status.from} → ${c.status.to}`);
  if (c.memberId) parts.push(`member ID ${c.memberId.from || '—'} → ${c.memberId.to || '—'}`);
  if (c.avatar) parts.push('avatar');
  if (parts.length) {
    await audit({
      ...actor(admin),
      action: 'user.update',
      targetIds: [id],
      summary: parts.join(' · '),
      meta: { ...c, password: undefined },
    });
  }

  revalidateUsers(id);
  return { ok: true };
}

export async function setUserProgramsAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = programsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const res = await setUserPrograms(admin.orgId, parsed.data.id, parsed.data.programIds);
  if (!res.ok) return res;

  if (res.added.length || res.removed.length) {
    await audit({
      ...actor(admin),
      action: 'user.programs',
      targetIds: [parsed.data.id],
      summary: `+${res.added.length} / −${res.removed.length} programs`,
      meta: { added: res.added, removed: res.removed },
    });
  }

  revalidateUsers(parsed.data.id);
  revalidatePath('/admin/programs');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete (single or many)
// ---------------------------------------------------------------------------

export type DeleteActionResult =
  | { ok: true; deleted: number; blocked: { id: string; name: string; reason: string }[] }
  | { ok: false; error: string };

export async function deleteUsersAction(raw: unknown): Promise<DeleteActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = idsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { allowed, skipped } = await splitAdminTargets(admin, parsed.data.ids);
  const res = await deleteUsers(admin.orgId, allowed, admin.id);
  if (!res.ok) return res;
  res.blocked.push(...skipped);

  if (res.deleted > 0) {
    await audit({
      ...actor(admin),
      action: 'user.delete',
      targetIds: res.deletedUsers.map((u) => u.id),
      summary:
        `Deleted ${res.deleted}: ` +
        res.deletedUsers.slice(0, 5).map((u) => u.email).join(', ') +
        (res.deletedUsers.length > 5 ? ` +${res.deletedUsers.length - 5} more` : ''),
      // Keep who was deleted — the user records themselves are gone.
      meta: { users: res.deletedUsers.slice(0, 500) },
    });
  }

  revalidateUsers();
  revalidatePath('/admin/programs');
  revalidatePath('/dashboard');
  return { ok: true, deleted: res.deleted, blocked: res.blocked };
}

// ---------------------------------------------------------------------------
// Bulk status / role change
// ---------------------------------------------------------------------------

export type BulkActionResult =
  | { ok: true; updated: number; skippedSelf: boolean }
  | { ok: false; error: string };

export async function bulkUpdateUsersAction(raw: unknown): Promise<BulkActionResult> {
  const admin = (await requireRole('admin')) as Admin;

  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (!parsed.data.status && !parsed.data.role) {
    return { ok: false, error: 'Nothing to change' };
  }
  if (parsed.data.role === 'admin' && !parsed.data.confirmAdmin) {
    return { ok: false, error: 'Granting admin access must be confirmed.' };
  }
  if (parsed.data.role === 'admin' && !(await isRoyal(admin as never))) return { ok: false, error: ROYAL_ONLY };
  const { allowed, skipped } = await splitAdminTargets(admin, parsed.data.ids);
  if (!allowed.length && skipped.length) return { ok: false, error: ROYAL_ONLY };

  const res = await bulkUpdateUsers(admin.orgId, allowed, admin.id, {
    status: parsed.data.status,
    role: parsed.data.role,
  });
  if (!res.ok) return res;

  if (res.targetIds.length) {
    const what = [
      parsed.data.status ? `status → ${parsed.data.status}` : '',
      parsed.data.role ? `role → ${parsed.data.role}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    await audit({
      ...actor(admin),
      action: 'user.bulk_update',
      targetIds: res.targetIds,
      summary: `${what} for ${res.targetIds.length} user${res.targetIds.length === 1 ? '' : 's'}`,
      meta: { status: parsed.data.status, role: parsed.data.role },
    });
  }

  revalidateUsers();
  return { ok: true, updated: res.updated, skippedSelf: res.skippedSelf };
}

// ---------------------------------------------------------------------------
// Sign out everywhere
// ---------------------------------------------------------------------------

export async function revokeSessionsAction(
  raw: unknown
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = idsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  // Signing yourself out from here would end this admin session mid-action.
  const { allowed } = await splitAdminTargets(admin, parsed.data.ids);
  const ids = allowed.filter((x) => x !== admin.id);
  if (!ids.length) {
    return {
      ok: false,
      error: parsed.data.ids.includes(admin.id) && parsed.data.ids.length === 1
        ? 'Use the normal Sign out button for your own account.'
        : ROYAL_ONLY,
    };
  }

  const res = await revokeSessions(admin.orgId, ids);
  if (!res.ok) return res;

  await audit({
    ...actor(admin),
    action: 'user.sessions_revoked',
    targetIds: res.targetIds,
    summary: `Signed out ${res.updated} user${res.updated === 1 ? '' : 's'} on all devices`,
  });
  revalidateUsers(ids.length === 1 ? ids[0] : undefined);
  return { ok: true, updated: res.updated };
}

// ---------------------------------------------------------------------------
// Member IDs
// ---------------------------------------------------------------------------

export async function nextMemberIdAction(
  raw: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = z.object({ format: z.string().max(40).optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const format = parsed.data.format?.trim() || (await getSettings()).memberIdFormat;
  const res = await nextMemberIds(admin.orgId, format, 1);
  if (!res.ok) return res;
  return { ok: true, id: res.ids[0] };
}

/** Preview for the "Assign member IDs" button — saves nothing. */
export async function previewAssignMemberIdsAction(
  raw: unknown
): Promise<AssignPreview | { ok: false; error: string }> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const format = (parsed.data.format?.trim() || (await getSettings()).memberIdFormat).toUpperCase();
  return previewMissingMemberIds(admin.orgId, format, { role: parsed.data.role, ids: parsed.data.ids });
}

/** Give every user without a member ID (optionally: one role, or selected users) the next ID. */
export async function assignMemberIdsAction(
  raw: unknown
): Promise<
  | { ok: true; assigned: number; failed: number; first: string; last: string }
  | { ok: false; error: string }
> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const format = (parsed.data.format?.trim() || (await getSettings()).memberIdFormat).toUpperCase();

  const res = await assignMissingMemberIds(admin.orgId, format, {
    role: parsed.data.role,
    ids: parsed.data.ids,
  });
  if (!res.ok) return res;

  if (res.assigned > 0) {
    await audit({
      ...actor(admin),
      action: 'user.member_ids_assigned',
      targetIds: res.assignedIds,
      summary: `Assigned ${res.assigned} member ID${res.assigned === 1 ? '' : 's'} (${res.first} … ${res.last}) using ${format}`,
      meta: { format, role: parsed.data.role ?? 'all', first: res.first, last: res.last, failed: res.failed },
    });
  }

  revalidateUsers();
  return { ok: true, assigned: res.assigned, failed: res.failed, first: res.first, last: res.last };
}

/** Save the "required" switch and/or the default format into Settings. */
export async function saveMemberIdRulesAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = rulesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const patch: { memberIdRequired?: boolean; memberIdFormat?: string } = {};
  if (parsed.data.memberIdRequired !== undefined) patch.memberIdRequired = parsed.data.memberIdRequired;
  if (parsed.data.memberIdFormat !== undefined) {
    const f = parsed.data.memberIdFormat.trim().toUpperCase();
    const err = validateMemberIdFormat(f);
    if (err) return { ok: false, error: err };
    patch.memberIdFormat = f;
  }

  await updateSettings(patch, admin.id);
  await audit({
    ...actor(admin),
    action: 'settings.member_ids',
    summary: [
      patch.memberIdRequired !== undefined ? `required: ${patch.memberIdRequired ? 'yes' : 'no'}` : '',
      patch.memberIdFormat ? `format: ${patch.memberIdFormat}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    meta: patch,
  });
  revalidatePath('/admin/users', 'layout');
  revalidatePath('/admin/settings');
  return { ok: true };
}


// ---------------------------------------------------------------------------
// Royal admin
// ---------------------------------------------------------------------------

/** Non-royal admins may not act on admin accounts: split them out. */
async function splitAdminTargets(admin: Admin, ids: string[]) {
  if (await isRoyal(admin as never)) return { allowed: ids, skipped: [] as { id: string; name: string; reason: string }[] };
  const info = await getRoleInfo(admin.orgId, ids);
  const allowed: string[] = [];
  const skipped: { id: string; name: string; reason: string }[] = [];
  for (const id of ids) {
    const t = info.get(id);
    if (t?.role === 'admin' && id !== admin.id) skipped.push({ id, name: t.name, reason: 'Admin accounts need a royal admin' });
    else allowed.push(id);
  }
  return { allowed, skipped };
}

/** Grant / remove royal admin status. Royal admins only; never your own. */
export async function setRoyalAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = z.object({ id: idField, royal: z.boolean() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  if (!(await isRoyal(admin as never))) return { ok: false, error: 'Only a royal admin can do this.' };
  if (parsed.data.id === admin.id) return { ok: false, error: "You can't change your own royal status." };

  const target = (await getRoleInfo(admin.orgId, [parsed.data.id])).get(parsed.data.id);
  const res = await setRoyal(admin.orgId, parsed.data.id, parsed.data.royal);
  if (!res.ok) return res;
  await audit({
    ...actor(admin),
    action: parsed.data.royal ? 'security.royal_granted' : 'security.royal_revoked',
    targetIds: [parsed.data.id],
    summary: `${target?.name ?? 'Admin'} <${target?.email ?? ''}>`,
  });
  revalidatePath('/admin/security');
  revalidateUsers(parsed.data.id);
  return { ok: true };
}

/**
 * Bootstrap: while the organisation has no royal admin yet, any admin can make
 * themselves the first one. After that, only royal admins can grant it.
 */
export async function claimRoyalAction(): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;
  await invalidateOrgRoyal(admin.orgId);
  if (await orgHasRoyal(admin.orgId)) {
    return { ok: false, error: 'A royal admin already exists. Ask them to grant you access.' };
  }
  const res = await setRoyal(admin.orgId, admin.id, true);
  if (!res.ok) return res;
  await audit({
    ...actor(admin),
    action: 'security.royal_granted',
    targetIds: [admin.id],
    summary: 'First royal admin (claimed during setup)',
  });
  revalidatePath('/admin/security');
  revalidatePath('/admin/users', 'layout');
  return { ok: true };
}

/**
 * Reset a user's two-step sign-in (lost phone and no recovery codes).
 * Royal admins only. The user can sign in with just their password and set
 * it up again. Audited.
 */
export async function resetTwoFactorAction(raw: unknown): Promise<ActionResult> {
  const admin = (await requireRole('admin')) as Admin;
  const parsed = z.object({ id: idField }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  if (!(await isRoyal(admin as never))) return { ok: false, error: 'Only a royal admin can do this.' };
  const target = (await getRoleInfo(admin.orgId, [parsed.data.id])).get(parsed.data.id);
  if (!target) return { ok: false, error: 'User not found' };
  const { clearTwoFactor } = await import('@/lib/two-factor');
  await clearTwoFactor(admin.orgId, parsed.data.id);
  await audit({
    ...actor(admin),
    action: 'security.2fa_reset',
    targetIds: [parsed.data.id],
    summary: `${target.name ?? 'User'} <${target.email ?? ''}>`,
  });
  revalidateUsers(parsed.data.id);
  return { ok: true };
}
