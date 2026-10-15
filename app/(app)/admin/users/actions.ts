// =============================================================================
// FILE: app/(app)/admin/users/actions.ts
// Server actions for user management (admin only).
// Existing: createUserAction, updateUserAction, setUserProgramsAction
// NEW:      memberId on create/update (+ "required" rule from Settings),
//           optional welcome email on create,
//           deleteUsersAction (single or bulk), bulkUpdateUsersAction,
//           nextMemberIdAction (Generate button), saveMemberIdRulesAction
//           (required switch + default format, stored in Settings).
// =============================================================================

'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-helpers';
import {
  createUser,
  updateUser,
  setUserPrograms,
  deleteUsers,
  bulkUpdateUsers,
  nextMemberIds,
} from '@/lib/users';
import { getSettings, updateSettings } from '@/lib/settings';
import { validateMemberIdFormat, normalizeMemberId } from '@/lib/member-id';
import { ROLES } from '@/models/User';

const memberIdField = z.string().max(40, 'Member ID must be 40 characters or fewer');

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(ROLES),
  avatar: z.string().max(500).optional().default(''),
  memberId: memberIdField.optional().default(''),
  sendEmail: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  avatar: z.string().max(500).optional(),
  password: z.string().min(6).max(100).optional(),
  memberId: memberIdField.optional(),
});

const programsSchema = z.object({
  id: z.string().min(1),
  programIds: z.array(z.string()).default([]),
});

const idsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one user').max(500),
});

const bulkSchema = idsSchema.extend({
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(ROLES).optional(),
});

const rulesSchema = z.object({
  memberIdRequired: z.boolean().optional(),
  memberIdFormat: z.string().max(40).optional(),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function revalidateUsers(id?: string) {
  revalidatePath('/admin/users');
  if (id) revalidatePath(`/admin/users/${id}`);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createUserAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const settings = await getSettings();
  const memberId = normalizeMemberId(parsed.data.memberId);
  if (settings.memberIdRequired && !memberId) {
    return { ok: false, error: 'Member ID is required (change this in Settings → Members)' };
  }

  const { sendEmail: shouldEmail, ...data } = parsed.data;
  const res = await createUser({ orgId: admin.orgId, ...data, memberId });
  if (!res.ok) return res;

  if (shouldEmail) {
    // Read request headers now (not inside the detached task)
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? 'http';
    // Fire-and-forget welcome email
    void (async () => {
      try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
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
          link: `${proto}://${host}/login`,
          ctaLabel: 'Sign in',
        });
      } catch (e) {
        console.error('[createUserAction] welcome email failed', e);
      }
    })();
  }

  revalidateUsers();
  return { ok: true, id: res.id };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateUserAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

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

  const res = await updateUser(admin.orgId, id, patch);
  if (!res.ok) return res;

  revalidateUsers(id);
  return { ok: true };
}

export async function setUserProgramsAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = programsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await setUserPrograms(
    admin.orgId,
    parsed.data.id,
    parsed.data.programIds
  );
  if (!res.ok) return res;

  revalidateUsers(parsed.data.id);
  revalidatePath('/admin/programs');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NEW: delete (single or many)
// ---------------------------------------------------------------------------

export type DeleteActionResult =
  | { ok: true; deleted: number; blocked: { id: string; name: string; reason: string }[] }
  | { ok: false; error: string };

export async function deleteUsersAction(raw: unknown): Promise<DeleteActionResult> {
  const admin = await requireRole('admin');

  const parsed = idsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await deleteUsers(admin.orgId, parsed.data.ids, admin.id);
  if (!res.ok) return res;

  revalidateUsers();
  revalidatePath('/admin/programs');
  revalidatePath('/dashboard');
  return res;
}

// ---------------------------------------------------------------------------
// NEW: bulk status / role change
// ---------------------------------------------------------------------------

export type BulkActionResult =
  | { ok: true; updated: number; skippedSelf: boolean }
  | { ok: false; error: string };

export async function bulkUpdateUsersAction(raw: unknown): Promise<BulkActionResult> {
  const admin = await requireRole('admin');

  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  if (!parsed.data.status && !parsed.data.role) {
    return { ok: false, error: 'Nothing to change' };
  }

  const res = await bulkUpdateUsers(admin.orgId, parsed.data.ids, admin.id, {
    status: parsed.data.status,
    role: parsed.data.role,
  });
  if (!res.ok) return res;

  revalidateUsers();
  return res;
}

// ---------------------------------------------------------------------------
// NEW: member ID helpers
// ---------------------------------------------------------------------------

export async function nextMemberIdAction(
  raw: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requireRole('admin');
  const parsed = z.object({ format: z.string().max(40).optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const format = parsed.data.format?.trim() || (await getSettings()).memberIdFormat;
  const res = await nextMemberIds(admin.orgId, format, 1);
  if (!res.ok) return res;
  return { ok: true, id: res.ids[0] };
}

/** Save the "required" switch and/or the default format into Settings. */
export async function saveMemberIdRulesAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');
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
  revalidatePath('/admin/users', 'layout');
  revalidatePath('/admin/settings');
  return { ok: true };
}