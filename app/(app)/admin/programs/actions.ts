// =============================================================================
// FILE: app/(app)/admin/programs/actions.ts
// Server actions for programs (admin only).
// Existing: saveProgramAction, deleteProgramAction, setMembersAction (unchanged).
// NEW:      setProgramStatusAction (quick Activate / Archive / Draft)
//           duplicateProgramAction (copy details + members into a new draft)
// Only uses functions that already exist in lib/programs.ts.
// =============================================================================

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-helpers';
import {
  createProgram,
  updateProgram,
  deleteProgram,
  setProgramMembers,
  getProgram,
} from '@/lib/programs';

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

const membersSchema = z.object({
  programId: z.string().min(1),
  role: z.enum(['mentor', 'student']),
  userIds: z.array(z.string()).default([]),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'active', 'archived']),
});

const duplicateSchema = z.object({
  id: z.string().min(1),
  includeMentors: z.boolean().optional().default(true),
  includeStudents: z.boolean().optional().default(false),
});

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveProgramAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  if (parsed.data.id) {
    const res = await updateProgram(admin.orgId, parsed.data.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
    });
    if (!res.ok) return res;

    revalidatePath('/admin/programs');
    revalidatePath(`/admin/programs/${parsed.data.id}`);
    return { ok: true, id: parsed.data.id };
  }

  const res = await createProgram({
    orgId: admin.orgId,
    name: parsed.data.name,
    description: parsed.data.description,
    status: parsed.data.status,
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
    createdBy: admin.id,
  });
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  return { ok: true, id: res.id };
}

export async function deleteProgramAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const res = await deleteProgram(admin.orgId, parsed.data.id);
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function setMembersAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = membersSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const res = await setProgramMembers(
    admin.orgId,
    parsed.data.programId,
    parsed.data.role,
    parsed.data.userIds
  );
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  revalidatePath(`/admin/programs/${parsed.data.programId}`);
  revalidatePath('/admin/users');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NEW: quick status change (keeps every other field as it is)
// ---------------------------------------------------------------------------
export async function setProgramStatusAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const program = await getProgram(admin.orgId, parsed.data.id);
  if (!program) return { ok: false, error: 'Program not found' };

  const res = await updateProgram(admin.orgId, program.id, {
    name: program.name,
    description: program.description ?? '',
    status: parsed.data.status,
    startDate: toIsoOrNull(program.startDate),
    endDate: toIsoOrNull(program.endDate),
  });
  if (!res.ok) return res;

  revalidatePath('/admin/programs');
  revalidatePath(`/admin/programs/${program.id}`);
  return { ok: true, id: program.id };
}

// ---------------------------------------------------------------------------
// NEW: duplicate a program (new draft, optional mentors / students)
// ---------------------------------------------------------------------------
export async function duplicateProgramAction(raw: unknown): Promise<ActionResult> {
  const admin = await requireRole('admin');

  const parsed = duplicateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const source = await getProgram(admin.orgId, parsed.data.id);
  if (!source) return { ok: false, error: 'Program not found' };

  const created = await createProgram({
    orgId: admin.orgId,
    name: `${source.name} (copy)`.slice(0, 120),
    description: source.description ?? '',
    status: 'draft',
    startDate: toIsoOrNull(source.startDate),
    endDate: toIsoOrNull(source.endDate),
    createdBy: admin.id,
  });
  if (!created.ok || !created.id) {
    return created.ok ? { ok: false, error: 'Could not create the copy' } : created;
  }

  if (parsed.data.includeMentors && source.mentors.length > 0) {
    const r = await setProgramMembers(
      admin.orgId,
      created.id,
      'mentor',
      source.mentors.map((m) => m.id)
    );
    if (!r.ok) return r;
  }
  if (parsed.data.includeStudents && source.students.length > 0) {
    const r = await setProgramMembers(
      admin.orgId,
      created.id,
      'student',
      source.students.map((s) => s.id)
    );
    if (!r.ok) return r;
  }

  revalidatePath('/admin/programs');
  revalidatePath('/admin/users');
  return { ok: true, id: created.id };
}