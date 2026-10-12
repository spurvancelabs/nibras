import 'server-only';
import { db } from './db';
import Material from '@/models/Material';
import type { MaterialKind } from '@/lib/constants';

export type MaterialItem = {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  kind: MaterialKind;
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  size: number;
  originalName: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedByAvatar: string;
  createdAt: string;
};

type LeanPopulated = {
  _id: unknown;
  sessionId: unknown;
  title: string;
  description?: string;
  kind: MaterialKind;
  url: string;
  publicId?: string;
  resourceType?: string;
  format?: string;
  size?: number;
  originalName?: string;
  uploadedBy: { _id: unknown; name: string; avatar?: string } | null;
  createdAt: Date;
};

function mapRow(r: LeanPopulated): MaterialItem {
  return {
    id: String(r._id),
    sessionId: String(r.sessionId),
    title: r.title,
    description: r.description ?? '',
    kind: r.kind,
    url: r.url,
    publicId: r.publicId ?? '',
    resourceType: r.resourceType ?? 'image',
    format: r.format ?? '',
    size: r.size ?? 0,
    originalName: r.originalName ?? '',
    uploadedById: r.uploadedBy ? String(r.uploadedBy._id) : '',
    uploadedByName: r.uploadedBy?.name ?? 'Unknown',
    uploadedByAvatar: r.uploadedBy?.avatar ?? '',
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export async function listMaterials(
  orgId: string,
  sessionId: string
): Promise<MaterialItem[]> {
  await db();
  const rows = await Material.find({ orgId, sessionId })
    .sort({ createdAt: 1 })
    .populate('uploadedBy', 'name avatar')
    .lean();

  return (rows as unknown as LeanPopulated[]).map(mapRow);
}

export async function getMaterial(
  orgId: string,
  id: string
): Promise<MaterialItem | null> {
  await db();
  const row = await Material.findOne({ _id: id, orgId })
    .populate('uploadedBy', 'name avatar')
    .lean();
  if (!row) return null;
  return mapRow(row as unknown as LeanPopulated);
}

export async function createMaterial(input: {
  orgId: string;
  sessionId: string;
  programId: string;
  title: string;
  description?: string;
  kind: MaterialKind;
  url: string;
  publicId?: string;
  resourceType?: string;
  format?: string;
  size?: number;
  originalName?: string;
  uploadedBy: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const doc = await Material.create({
    orgId: input.orgId,
    sessionId: input.sessionId,
    programId: input.programId,
    title: input.title.trim(),
    description: input.description ?? '',
    kind: input.kind,
    url: input.url,
    publicId: input.publicId ?? '',
    resourceType: input.resourceType ?? 'image',
    format: input.format ?? '',
    size: input.size ?? 0,
    originalName: input.originalName ?? '',
    uploadedBy: input.uploadedBy,
  });

  return { ok: true, id: String(doc._id) };
}

export async function updateMaterial(
  orgId: string,
  id: string,
  patch: {
    title?: string;
    description?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.description !== undefined) set.description = patch.description;

  const res = await Material.updateOne({ _id: id, orgId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, error: 'Material not found' };
  return { ok: true };
}

export async function deleteMaterial(
  orgId: string,
  id: string
): Promise<{ ok: true; publicId: string; resourceType: string } | { ok: false; error: string }> {
  await db();
  const doc = await Material.findOne({ _id: id, orgId })
    .select('publicId resourceType')
    .lean();
  if (!doc) return { ok: false, error: 'Material not found' };

  await Material.deleteOne({ _id: id, orgId });
  return {
    ok: true,
    publicId: (doc.publicId as string) ?? '',
    resourceType: (doc.resourceType as string) ?? 'image',
  };
}