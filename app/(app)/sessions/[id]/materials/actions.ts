'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterial,
} from '@/lib/materials';
import { getSession, canManageSession } from '@/lib/sessions';
import { deleteCloudinaryAsset } from '@/lib/cloudinary-server';
import { MATERIAL_KINDS } from '@/lib/constants';
import { notifyMany } from '@/lib/notifications';
import { isProgramActive } from '@/lib/programs';
import Program from '@/models/Program';

const createSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  kind: z.enum(MATERIAL_KINDS),
  url: z.string().min(1).max(1000),
  publicId: z.string().max(500).optional().default(''),
  resourceType: z.string().max(50).optional().default('image'),
  format: z.string().max(20).optional().default(''),
  size: z.number().nonnegative().optional().default(0),
  originalName: z.string().max(300).optional().default(''),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function assertCanManage(sessionId: string) {
  const user = await requireAuth();
  if (user.role === 'student') return { user, error: 'Not allowed' as const };

  const session = await getSession(user.orgId, sessionId);
  if (!session) return { user, error: 'Session not found' as const };

  const can = await canManageSession(
    user.orgId,
    user,
    session.mentorId,
    session.programId
  );
  if (!can) return { user, error: 'Not allowed' as const };

  return { user, session, error: null };
}

export async function createMaterialAction(raw: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  const guard = await assertCanManage(data.sessionId);
  if (guard.error) return { ok: false, error: guard.error };

  const active = await isProgramActive(guard.user.orgId, guard.session!.programId);
  if (!active) {
    return { ok: false, error: 'Cannot add materials to a draft or archived program' };
  }

  const res = await createMaterial({
    orgId: guard.user.orgId,
    sessionId: data.sessionId,
    programId: guard.session!.programId,
    title: data.title,
    description: data.description,
    kind: data.kind,
    url: data.url,
    publicId: data.publicId,
    resourceType: data.resourceType,
    format: data.format,
    size: data.size,
    originalName: data.originalName,
    uploadedBy: guard.user.id,
  });
  if (!res.ok) return res;

  // Notify students of the program
  const program = await Program.findOne({
    _id: guard.session!.programId,
    orgId: guard.user.orgId,
  })
    .select('students name')
    .lean();
  const studentIds = (program?.students ?? []).map(String);
  if (studentIds.length > 0) {
    await notifyMany({
      orgId: guard.user.orgId,
      userIds: studentIds,
      includeAdmins: true,
      type: 'material.new',
      title: `New material: ${data.title}`,
      body: `Added to "${guard.session!.title}" in ${program?.name ?? 'your program'}.`,
      link: `/sessions/${data.sessionId}`,
      email: false,
    });
  }

  revalidatePath(`/sessions/${data.sessionId}`);
  return { ok: true, id: res.id };
}

export async function updateMaterialAction(raw: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const existing = await getMaterial(
    (await requireAuth()).orgId,
    parsed.data.id
  );
  if (!existing) return { ok: false, error: 'Material not found' };

  const guard = await assertCanManage(existing.sessionId);
  if (guard.error) return { ok: false, error: guard.error };

  const res = await updateMaterial(guard.user.orgId, parsed.data.id, {
    title: parsed.data.title,
    description: parsed.data.description,
  });
  if (!res.ok) return res;

  revalidatePath(`/sessions/${existing.sessionId}`);
  return { ok: true, id: parsed.data.id };
}

export async function deleteMaterialAction(raw: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const user = await requireAuth();
  const existing = await getMaterial(user.orgId, parsed.data.id);
  if (!existing) return { ok: false, error: 'Material not found' };

  const guard = await assertCanManage(existing.sessionId);
  if (guard.error) return { ok: false, error: guard.error };

  const res = await deleteMaterial(guard.user.orgId, parsed.data.id);
  if (!res.ok) return res;

  if (res.publicId) {
    await deleteCloudinaryAsset(
      res.publicId,
      (res.resourceType as 'image' | 'raw' | 'video') ?? 'image'
    );
  }

  revalidatePath(`/sessions/${existing.sessionId}`);
  return { ok: true };
}