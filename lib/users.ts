// =============================================================================
// FILE: lib/users.ts
// Server-only user helpers.
// NEW: memberId support, member-ID generator, user footprint, deleteUsers
//      (with clean-up), bulkUpdateUsers, and setUserPrograms now keeps
//      Program.mentors / Program.students in sync (was user-side only).
// =============================================================================

import 'server-only';
import { db } from './db';
import User, { type Role } from '@/models/User';
import Program from '@/models/Program';
import Submission from '@/models/Submission';
import Attendance from '@/models/Attendance';
import Query from '@/models/Query';
import QueryMessage from '@/models/QueryMessage';
import Notification from '@/models/Notification';
import Session from '@/models/Session';
import bcrypt from 'bcryptjs';
import {
  normalizeMemberId,
  memberIdPattern,
  generateMemberIds,
  validateMemberIdFormat,
  MEMBER_ID_MAX,
} from './member-id';

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  avatar: string;
  programIds: string[];
  createdAt: string;
  memberId: string;
};

type Ok = { ok: true };
type Err = { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(u: any): UserListItem {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Role,
    status: u.status as 'active' | 'disabled',
    avatar: u.avatar ?? '',
    programIds: (u.programIds ?? []).map(String),
    createdAt: new Date(u.createdAt).toISOString(),
    memberId: u.memberId ?? '',
  };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listUsers(
  orgId: string,
  filters?: { role?: Role; search?: string }
): Promise<UserListItem[]> {
  await db();

  const query: Record<string, unknown> = { orgId };
  if (filters?.role) query.role = filters.role;
  if (filters?.search) {
    const re = new RegExp(escapeRe(filters.search), 'i');
    query.$or = [{ name: re }, { email: re }, { memberId: re }];
  }

  const rows = await User.find(query).sort({ createdAt: -1 }).limit(500).lean();
  return rows.map(toItem);
}

export async function getUserById(
  orgId: string,
  id: string
): Promise<UserListItem | null> {
  await db();
  const u = await User.findOne({ _id: id, orgId }).lean();
  if (!u) return null;
  return toItem(u);
}

/** True when another user in the org already has this member ID. */
export async function isMemberIdTaken(
  orgId: string,
  memberId: string,
  excludeUserId?: string
): Promise<boolean> {
  await db();
  const id = normalizeMemberId(memberId);
  if (!id) return false;
  const q: Record<string, unknown> = { orgId, memberId: id };
  if (excludeUserId) q._id = { $ne: excludeUserId };
  return !!(await User.exists(q));
}

/** Next `count` free member IDs for a format (looks at what's already used). */
export async function nextMemberIds(
  orgId: string,
  format: string,
  count = 1,
  reserved: string[] = []
): Promise<{ ok: true; ids: string[] } | Err> {
  const fmtErr = validateMemberIdFormat(format);
  if (fmtErr) return { ok: false, error: fmtErr };
  await db();
  const re = new RegExp(memberIdPattern(format));
  const rows = await User.find({ orgId, memberId: { $regex: re } })
    .select('memberId')
    .lean();
  const existing = [
    ...rows.map((r) => String(r.memberId ?? '')),
    ...reserved.map(normalizeMemberId),
  ];
  return { ok: true, ids: generateMemberIds(format, count, existing) };
}

/** What would be removed if this user is deleted (shown in the danger zone). */
export async function getUserFootprint(orgId: string, id: string) {
  await db();
  const [programs, submissions, attendance, queries, sessionsAsMentor, notifications] =
    await Promise.all([
      Program.countDocuments({ orgId, $or: [{ mentors: id }, { students: id }] }),
      Submission.countDocuments({ orgId, studentId: id }),
      Attendance.countDocuments({ orgId, studentId: id }),
      Query.countDocuments({ orgId, studentId: id }),
      Session.countDocuments({ orgId, mentorId: id }),
      Notification.countDocuments({ orgId, userId: id }),
    ]);
  return { programs, submissions, attendance, queries, sessionsAsMentor, notifications };
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createUser(input: {
  orgId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar?: string;
  memberId?: string;
}): Promise<{ ok: true; id: string } | Err> {
  await db();

  const email = input.email.toLowerCase().trim();
  const exists = await User.findOne({ orgId: input.orgId, email });
  if (exists) return { ok: false, error: 'Email already exists in this organization' };

  const memberId = normalizeMemberId(input.memberId);
  if (memberId.length > MEMBER_ID_MAX) {
    return { ok: false, error: `Member ID must be ${MEMBER_ID_MAX} characters or fewer` };
  }
  if (memberId && (await isMemberIdTaken(input.orgId, memberId))) {
    return { ok: false, error: `Member ID ${memberId} is already in use` };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const doc = await User.create({
      orgId: input.orgId,
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role,
      avatar: input.avatar ?? '',
      status: 'active',
      programIds: [],
      ...(memberId ? { memberId } : {}),
    });
    return { ok: true, id: String(doc._id) };
  } catch (e) {
    const err = e as { code?: number; keyPattern?: Record<string, unknown> };
    if (err.code === 11000) {
      return {
        ok: false,
        error: err.keyPattern?.memberId ? 'Member ID is already in use' : 'Email already exists',
      };
    }
    throw e;
  }
}

export async function updateUser(
  orgId: string,
  id: string,
  patch: {
    name?: string;
    role?: Role;
    status?: 'active' | 'disabled';
    avatar?: string;
    password?: string;
    memberId?: string; // '' clears it
  }
): Promise<Ok | Err> {
  await db();

  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  if (patch.name !== undefined) set.name = patch.name.trim();
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.avatar !== undefined) set.avatar = patch.avatar;
  if (patch.password) set.passwordHash = await bcrypt.hash(patch.password, 10);

  if (patch.memberId !== undefined) {
    const memberId = normalizeMemberId(patch.memberId);
    if (!memberId) {
      unset.memberId = '';
    } else {
      if (memberId.length > MEMBER_ID_MAX) {
        return { ok: false, error: `Member ID must be ${MEMBER_ID_MAX} characters or fewer` };
      }
      if (await isMemberIdTaken(orgId, memberId, id)) {
        return { ok: false, error: `Member ID ${memberId} is already in use` };
      }
      set.memberId = memberId;
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  if (!Object.keys(update).length) return { ok: true };

  try {
    const res = await User.updateOne({ _id: id, orgId }, update);
    if (res.matchedCount === 0) return { ok: false, error: 'User not found' };
    return { ok: true };
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 11000) return { ok: false, error: 'Member ID is already in use' };
    throw e;
  }
}

/**
 * Set the programs a user belongs to.
 * Keeps BOTH sides in sync: User.programIds and Program.mentors / Program.students.
 */
export async function setUserPrograms(
  orgId: string,
  id: string,
  programIds: string[]
): Promise<Ok | Err> {
  await db();
  const user = await User.findOne({ _id: id, orgId }).select('role').lean();
  if (!user) return { ok: false, error: 'User not found' };

  // Only keep programs that really belong to this org
  const valid = await Program.find({ orgId, _id: { $in: programIds } }).select('_id').lean();
  const ids = valid.map((p) => String(p._id));

  await User.updateOne({ _id: id, orgId }, { $set: { programIds: ids } });

  const field = user.role === 'mentor' ? 'mentors' : 'students';
  // Remove from every program in the org, then add to the selected ones.
  await Program.updateMany(
    { orgId, _id: { $nin: ids } },
    { $pull: { mentors: id, students: id } }
  );
  if (ids.length) {
    await Program.updateMany({ orgId, _id: { $in: ids } }, { $addToSet: { [field]: id } });
  }
  return { ok: true };
}

/** Change status / role for many users at once (never the acting admin). */
export async function bulkUpdateUsers(
  orgId: string,
  ids: string[],
  actingUserId: string,
  patch: { status?: 'active' | 'disabled'; role?: Role }
): Promise<{ ok: true; updated: number; skippedSelf: boolean } | Err> {
  await db();
  const target = ids.filter((x) => x !== actingUserId);
  const set: Record<string, unknown> = {};
  if (patch.status) set.status = patch.status;
  if (patch.role) set.role = patch.role;
  if (!Object.keys(set).length || target.length === 0) {
    return { ok: true, updated: 0, skippedSelf: target.length !== ids.length };
  }
  const res = await User.updateMany({ orgId, _id: { $in: target } }, { $set: set });
  return { ok: true, updated: res.modifiedCount, skippedSelf: target.length !== ids.length };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export type DeleteUsersResult =
  | {
      ok: true;
      deleted: number;
      blocked: { id: string; name: string; reason: string }[];
    }
  | Err;

/**
 * Permanently delete users and clean up what belongs to them:
 *  - removed from all programs
 *  - their submissions, attendance records, query threads (+ messages)
 *    and notifications are deleted
 *  - threads they were assigned to as mentor are un-assigned
 * Blocked (not deleted):
 *  - the acting admin
 *  - mentors who still run sessions (reassign those sessions or disable instead)
 */
export async function deleteUsers(
  orgId: string,
  ids: string[],
  actingUserId: string
): Promise<DeleteUsersResult> {
  await db();
  const unique = Array.from(new Set(ids));
  const users = await User.find({ orgId, _id: { $in: unique } })
    .select('_id name role')
    .lean();

  const blocked: { id: string; name: string; reason: string }[] = [];
  const sessionCounts = (await Session.aggregate([
    { $match: { mentorId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$mentorId', n: { $sum: 1 } } },
  ])) as { _id: unknown; n: number }[];
  const sessionsByMentor = new Map<string, number>(
    sessionCounts.map((s) => [String(s._id), Number(s.n) || 0])
  );

  const deletable: string[] = [];
  for (const u of users) {
    const uid = String(u._id);
    if (uid === actingUserId) {
      blocked.push({ id: uid, name: u.name, reason: "You can't delete your own account" });
      continue;
    }
    const n = sessionsByMentor.get(uid) ?? 0;
    if (n > 0) {
      blocked.push({
        id: uid,
        name: u.name,
        reason: `Mentor of ${n} session${n === 1 ? '' : 's'} — reassign them or disable this user instead`,
      });
      continue;
    }
    deletable.push(uid);
  }

  if (deletable.length === 0) return { ok: true, deleted: 0, blocked };

  // Clean up related data
  await Program.updateMany(
    { orgId },
    { $pull: { mentors: { $in: deletable }, students: { $in: deletable } } }
  );
  await Submission.deleteMany({ orgId, studentId: { $in: deletable } });
  await Attendance.deleteMany({ orgId, studentId: { $in: deletable } });

  const ownQueries = await Query.find({ orgId, studentId: { $in: deletable } })
    .select('_id')
    .lean();
  const queryIds = ownQueries.map((q) => q._id);
  if (queryIds.length) {
    await QueryMessage.deleteMany({ orgId, queryId: { $in: queryIds } });
    await Query.deleteMany({ orgId, _id: { $in: queryIds } });
  }
  await Query.updateMany(
    { orgId, assignedMentorId: { $in: deletable } },
    { $set: { assignedMentorId: null } }
  );
  await Notification.deleteMany({ orgId, userId: { $in: deletable } });

  const res = await User.deleteMany({ orgId, _id: { $in: deletable } });
  return { ok: true, deleted: res.deletedCount ?? deletable.length, blocked };
}