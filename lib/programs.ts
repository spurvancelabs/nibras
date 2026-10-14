import 'server-only';
import { db } from './db';
import Program from '@/models/Program';
import User from '@/models/User';

export type ProgramListItem = {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  startDate: string | null;
  endDate: string | null;
  mentorCount: number;
  studentCount: number;
  createdAt: string;
};

export type ProgramDetail = ProgramListItem & {
  mentors: { id: string; name: string; email: string; avatar: string }[];
  students: { id: string; name: string; email: string; avatar: string }[];
};

export async function listPrograms(orgId: string): Promise<ProgramListItem[]> {
  await db();

  const rows = await Program.find({ orgId }).sort({ createdAt: -1 }).lean();

  return rows.map((p) => ({
    id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    status: p.status as 'draft' | 'active' | 'archived',
    startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
    endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
    mentorCount: (p.mentors ?? []).length,
    studentCount: (p.students ?? []).length,
    createdAt: new Date(p.createdAt).toISOString(),
  }));
}

export async function getProgram(
  orgId: string,
  id: string
): Promise<ProgramDetail | null> {
  await db();

  const p = await Program.findOne({ _id: id, orgId })
    .populate('mentors', 'name email avatar')
    .populate('students', 'name email avatar')
    .lean();

  if (!p) return null;

  const mapUser = (u: any) => ({
    id: String(u._id),
    name: u.name as string,
    email: u.email as string,
    avatar: (u.avatar as string) ?? '',
  });

  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    status: p.status as 'draft' | 'active' | 'archived',
    startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
    endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
    mentorCount: (p.mentors ?? []).length,
    studentCount: (p.students ?? []).length,
    createdAt: new Date(p.createdAt).toISOString(),
    mentors: (p.mentors ?? []).map(mapUser),
    students: (p.students ?? []).map(mapUser),
  };
}

export async function createProgram(input: {
  orgId: string;
  name: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: 'draft' | 'active' | 'archived';
  createdBy: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const doc = await Program.create({
    orgId: input.orgId,
    name: input.name.trim(),
    description: input.description ?? '',
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    status: input.status ?? 'active',
    createdBy: input.createdBy,
    mentors: [],
    students: [],
  });

  return { ok: true, id: String(doc._id) };
}

export async function updateProgram(
  orgId: string,
  id: string,
  patch: {
    name?: string;
    description?: string;
    status?: 'draft' | 'active' | 'archived';
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name.trim();
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.startDate !== undefined)
    set.startDate = patch.startDate ? new Date(patch.startDate) : null;
  if (patch.endDate !== undefined)
    set.endDate = patch.endDate ? new Date(patch.endDate) : null;

  const res = await Program.updateOne({ _id: id, orgId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, error: 'Program not found' };
  return { ok: true };
}

export async function deleteProgram(
  orgId: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  await Program.deleteOne({ _id: id, orgId });
  // Remove from all users
  await User.updateMany(
    { orgId },
    { $pull: { programIds: id } }
  );
  return { ok: true };
}

export async function setProgramMembers(
  orgId: string,
  programId: string,
  role: 'mentor' | 'student',
  userIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const field = role === 'mentor' ? 'mentors' : 'students';

  const res = await Program.updateOne(
    { _id: programId, orgId },
    { $set: { [field]: userIds } }
  );
  if (res.matchedCount === 0) return { ok: false, error: 'Program not found' };

  // Sync the reverse side (User.programIds) for the users just set.
  await User.updateMany(
    { orgId, role, _id: { $in: userIds } },
    { $addToSet: { programIds: programId } }
  );

  // Remove programId from users of this role who were deselected.
  await User.updateMany(
    { orgId, role, _id: { $nin: userIds }, programIds: programId },
    { $pull: { programIds: programId } }
  );

  return { ok: true };
}
export async function isProgramActive(
  orgId: string,
  programId: string
): Promise<boolean> {
  await db();
  const p = await Program.findOne({
    _id: programId,
    orgId,
    status: 'active',
  })
    .select('_id')
    .lean();
  return !!p;
}

export async function getProgramStatus(
  orgId: string,
  programId: string
): Promise<'draft' | 'active' | 'archived' | null> {
  await db();
  const p = await Program.findOne({ _id: programId, orgId })
    .select('status')
    .lean();
  return (p?.status as 'draft' | 'active' | 'archived' | undefined) ?? null;
}