// =============================================================================
// FILE: lib/users.ts
// Server-only user helpers.
// NEW in this version:
//   - searchUsers(): filtering, sorting and paging done in the database
//     (the old list stopped at 500 users and computed stats from that list)
//   - getUserStats(): exact counts via aggregation
//   - assignMissingMemberIds(): give every user without a member ID the next
//     number in a format (oldest accounts first), safe against clashes
//   - revokeSessions(): sign users out of every device
//   - password reset signs the user out everywhere
//   - role changes keep Program.mentors / Program.students correct
//   - deleteUsers() runs inside a transaction (all-or-nothing)
//   - avatar URLs must be http(s); names are cleaned
// Existing exports keep their names and behaviour.
// =============================================================================

import 'server-only';
import { Types, type ClientSession } from 'mongoose';
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
import { validatePassword } from './password';
import { invalidateAuthState } from './auth-state';
import { isEnvRoyal, invalidateOrgRoyal } from './royal';
import { isEnvSuper, envSuperEmails, invalidateOrgSuper } from './super';

export const BCRYPT_COST = 11;

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled' | 'pending';
  avatar: string;
  programIds: string[];
  createdAt: string;
  memberId: string;
  lastLoginAt: string | null;
  /** Royal admin (database flag or ROYAL_ADMIN_EMAILS). */
  royal: boolean;
  /** Royal through ROYAL_ADMIN_EMAILS — can't be removed in the app. */
  royalFromEnv: boolean;
  /** Super admin (database flag or SUPER_ADMIN_EMAILS). Bootstrap mode is not reflected here. */
  superAdmin: boolean;
  superFromEnv: boolean;
  /** Premium membership end (ISO) or null. */
  premiumUntil: string | null;
};

export type UserDetail = UserListItem & {
  lastLoginIp: string;
  passwordChangedAt: string | null;
  automationExempt: boolean;
  suspendedReason: string;
  suspendedBy: string;
  suspendedAt: string | null;
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
    status: u.status === 'disabled' ? 'disabled' : u.status === 'pending' ? 'pending' : 'active',
    avatar: u.avatar ?? '',
    programIds: (u.programIds ?? []).map(String),
    createdAt: new Date(u.createdAt).toISOString(),
    memberId: u.memberId ?? '',
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    royal: u.role === 'admin' && (u.royal === true || isEnvRoyal(u.email) || u.superAdmin === true || isEnvSuper(u.email)),
    royalFromEnv: u.role === 'admin' && isEnvRoyal(u.email),
    superAdmin: u.role === 'admin' && (u.superAdmin === true || isEnvSuper(u.email)),
    superFromEnv: u.role === 'admin' && isEnvSuper(u.email),
    premiumUntil: u.premiumUntil ? new Date(u.premiumUntil).toISOString() : null,
  };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const oid = (id: string) => new Types.ObjectId(id);
const isId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

/** Trim, collapse spaces, drop control characters. */
export function cleanName(v: string): string {
  // eslint-disable-next-line no-control-regex
  return (v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/** '' or an http(s) URL — blocks javascript:, data: and similar. */
export function checkAvatar(v: string | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (s.length > 500) return 'Avatar URL is too long';
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(s)) return 'Avatar must be an http(s) image URL';
  return null;
}

const MISSING_MEMBER_ID = {
  $or: [{ memberId: { $exists: false } }, { memberId: null }, { memberId: '' }],
};

// ---------------------------------------------------------------------------
// Transactions (MongoDB Atlas supports them; falls back gracefully if not)
// ---------------------------------------------------------------------------

function txnUnsupported(e: unknown) {
  const err = e as { code?: number; message?: string };
  return (
    err?.code === 20 ||
    /Transaction numbers are only allowed|replica set|does not support transactions/i.test(err?.message ?? '')
  );
}

async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  const m = await db();
  let session: ClientSession;
  try {
    session = await m.startSession();
  } catch {
    return fn(undefined);
  }
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } catch (e) {
    if (txnUnsupported(e)) return fn(undefined);
    throw e;
  } finally {
    await session.endSession().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export type UserFilters = {
  role?: Role;
  search?: string;
  status?: 'active' | 'disabled' | 'pending';
  programId?: string;
  memberId?: 'missing' | 'set';
  signin?: 'never' | 'ever';
  ids?: string[];
};

export type UserSort = 'newest' | 'oldest' | 'name' | 'memberId' | 'lastLogin';

function buildQuery(orgId: string, f: UserFilters = {}): Record<string, unknown> {
  const q: Record<string, unknown> = { orgId: oid(orgId) };
  const and: Record<string, unknown>[] = [];
  if (f.role) q.role = f.role;
  if (f.status) q.status = f.status;
  if (isId(f.programId)) q.programIds = oid(f.programId);
  if (f.search?.trim()) {
    const re = new RegExp(escapeRe(f.search.trim().slice(0, 100)), 'i');
    and.push({ $or: [{ name: re }, { email: re }, { memberId: re }] });
  }
  if (f.memberId === 'missing') and.push(MISSING_MEMBER_ID);
  if (f.memberId === 'set') q.memberId = { $type: 'string', $gt: '' };
  if (f.signin === 'never') q.lastLoginAt = null;
  if (f.signin === 'ever') q.lastLoginAt = { $ne: null };
  if (f.ids) q._id = { $in: f.ids.filter(isId).map(oid) };
  if (and.length) q.$and = and;
  return q;
}

/** Unchanged signature (other pages use it). Max 500 rows. */
export async function listUsers(
  orgId: string,
  filters?: { role?: Role; search?: string }
): Promise<UserListItem[]> {
  await db();
  const rows = await User.find(buildQuery(orgId, filters))
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return rows.map(toItem);
}

/** Filtered, sorted, paged list for the admin Users page. */
export async function searchUsers(
  orgId: string,
  filters: UserFilters,
  opts: { sort?: UserSort; page?: number; pageSize?: number } = {}
): Promise<{ rows: UserListItem[]; total: number; page: number; pageSize: number; pages: number }> {
  await db();
  const pageSize = Math.min(Math.max(opts.pageSize ?? 100, 10), 200);
  const page = Math.max(1, Math.floor(opts.page ?? 1));

  const sortStage: Record<UserSort, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name: { _nameSort: 1, _id: 1 },
    memberId: { _midMissing: 1, memberId: 1, _id: 1 },
    lastLogin: { _loginSort: -1, _id: -1 },
  };

  const [res] = (await User.aggregate([
    { $match: buildQuery(orgId, filters) },
    {
      $addFields: {
        _nameSort: { $toLower: { $ifNull: ['$name', ''] } },
        _midMissing: { $cond: [{ $gt: [{ $ifNull: ['$memberId', ''] }, ''] }, 0, 1] },
        _loginSort: { $ifNull: ['$lastLoginAt', new Date(0)] },
      },
    },
    { $sort: sortStage[opts.sort ?? 'newest'] },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          // aggregate() ignores `select: false` — never send password hashes
          { $project: { passwordHash: 0, _nameSort: 0, _midMissing: 0, _loginSort: 0 } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ])) as { rows: unknown[]; total: { n: number }[] }[];

  const total = res?.total?.[0]?.n ?? 0;
  return {
    rows: (res?.rows ?? []).map(toItem),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type UserStats = {
  total: number;
  admin: number;
  mentor: number;
  student: number;
  disabled: number;
  noMemberId: number;
  noMemberIdByRole: Record<Role, number>;
  neverSignedIn: number;
};

export async function getUserStats(orgId: string): Promise<UserStats> {
  await db();
  const noMid = { $not: [{ $gt: [{ $ifNull: ['$memberId', ''] }, ''] }] };
  const [r] = (await User.aggregate([
    { $match: { orgId: oid(orgId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        admin: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        mentor: { $sum: { $cond: [{ $eq: ['$role', 'mentor'] }, 1, 0] } },
        student: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
        disabled: { $sum: { $cond: [{ $eq: ['$status', 'disabled'] }, 1, 0] } },
        noMemberId: { $sum: { $cond: [noMid, 1, 0] } },
        noMidAdmin: { $sum: { $cond: [{ $and: [noMid, { $eq: ['$role', 'admin'] }] }, 1, 0] } },
        noMidMentor: { $sum: { $cond: [{ $and: [noMid, { $eq: ['$role', 'mentor'] }] }, 1, 0] } },
        noMidStudent: { $sum: { $cond: [{ $and: [noMid, { $eq: ['$role', 'student'] }] }, 1, 0] } },
        neverSignedIn: { $sum: { $cond: [{ $ifNull: ['$lastLoginAt', false] }, 0, 1] } },
      },
    },
  ])) as Record<string, number>[];
  return {
    total: r?.total ?? 0,
    admin: r?.admin ?? 0,
    mentor: r?.mentor ?? 0,
    student: r?.student ?? 0,
    disabled: r?.disabled ?? 0,
    noMemberId: r?.noMemberId ?? 0,
    noMemberIdByRole: {
      admin: r?.noMidAdmin ?? 0,
      mentor: r?.noMidMentor ?? 0,
      student: r?.noMidStudent ?? 0,
    },
    neverSignedIn: r?.neverSignedIn ?? 0,
  };
}

export async function getUserById(orgId: string, id: string): Promise<UserDetail | null> {
  if (!isId(id)) return null;
  await db();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u: any = await User.findOne({ _id: id, orgId }).lean();
  if (!u) return null;
  return {
    ...toItem(u),
    lastLoginIp: u.lastLoginIp ?? '',
    passwordChangedAt: u.passwordChangedAt ? new Date(u.passwordChangedAt).toISOString() : null,
    automationExempt: u.automationExempt === true,
    suspendedReason: u.suspendedReason ?? '',
    suspendedBy: u.suspendedBy ?? '',
    suspendedAt: u.suspendedAt ? new Date(u.suspendedAt).toISOString() : null,
  };
}

/** Fast counts for dashboards (no documents loaded). */
export async function countUsersByRole(orgId: string): Promise<{ total: number; admin: number; mentor: number; student: number }> {
  await db();
  const [admin, mentor, student] = await Promise.all(
    (['admin', 'mentor', 'student'] as const).map((role) => User.countDocuments({ orgId, role }))
  );
  return { total: admin + mentor + student, admin, mentor, student };
}

/** Names/emails for a set of ids (used by the audit log). */
export async function getUserNames(orgId: string, ids: string[]): Promise<Map<string, { name: string; email: string }>> {
  const valid = Array.from(new Set(ids.filter(isId)));
  if (!valid.length) return new Map();
  await db();
  const rows = (await User.find({ orgId, _id: { $in: valid } }).select('name email').lean()) as {
    _id: unknown;
    name: string;
    email: string;
  }[];
  return new Map(rows.map((r) => [String(r._id), { name: r.name, email: r.email }]));
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

async function existingIdsForFormat(orgId: string, format: string): Promise<string[]> {
  const re = new RegExp(memberIdPattern(format));
  const rows = await User.find({ orgId, memberId: { $regex: re } }).select('memberId').lean();
  return rows.map((r) => String((r as { memberId?: string }).memberId ?? ''));
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
  const existing = [...(await existingIdsForFormat(orgId, format)), ...reserved.map(normalizeMemberId)];
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
// Program membership helpers
// ---------------------------------------------------------------------------

/** Put each user in the right list (mentors vs students) of their programs. */
async function syncProgramRoleField(orgId: string, userIds: string[]) {
  const users = (await User.find({ orgId, _id: { $in: userIds } })
    .select('role programIds')
    .lean()) as { _id: Types.ObjectId; role: Role; programIds?: Types.ObjectId[] }[];
  const ops = users
    .filter((u) => (u.programIds ?? []).length > 0)
    .map((u) => {
      const field = u.role === 'mentor' ? 'mentors' : 'students';
      const other = field === 'mentors' ? 'students' : 'mentors';
      return {
        updateMany: {
          filter: { orgId: oid(orgId), _id: { $in: u.programIds } },
          update: { $pull: { [other]: u._id }, $addToSet: { [field]: u._id } },
        },
      };
    });
  if (ops.length) await Program.bulkWrite(ops, { ordered: false });
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

  const name = cleanName(input.name);
  if (!name) return { ok: false, error: 'Name is required' };
  const email = input.email.toLowerCase().trim();
  const pwErr = validatePassword(input.password, { email });
  if (pwErr) return { ok: false, error: pwErr };
  const avErr = checkAvatar(input.avatar);
  if (avErr) return { ok: false, error: avErr };

  const exists = await User.findOne({ orgId: input.orgId, email });
  if (exists) return { ok: false, error: 'Email already exists in this organization' };

  const memberId = normalizeMemberId(input.memberId);
  if (memberId.length > MEMBER_ID_MAX) {
    return { ok: false, error: `Member ID must be ${MEMBER_ID_MAX} characters or fewer` };
  }
  if (memberId && (await isMemberIdTaken(input.orgId, memberId))) {
    return { ok: false, error: `Member ID ${memberId} is already in use` };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const doc = await User.create({
      orgId: input.orgId,
      name,
      email,
      passwordHash,
      role: input.role,
      avatar: (input.avatar ?? '').trim(),
      status: 'active',
      programIds: [],
      sessionVersion: 0,
      passwordChangedAt: new Date(),
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

export type UpdateChanges = {
  name?: { from: string; to: string };
  role?: { from: Role; to: Role };
  status?: { from: string; to: string };
  memberId?: { from: string; to: string };
  avatar?: boolean;
  password?: boolean;
};

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
): Promise<(Ok & { changes: UpdateChanges }) | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const before: any = await User.findOne({ _id: id, orgId })
    .select('name email role status avatar memberId')
    .lean();
  if (!before) return { ok: false, error: 'User not found' };

  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  const inc: Record<string, number> = {};
  const changes: UpdateChanges = {};

  if (patch.name !== undefined) {
    const name = cleanName(patch.name);
    if (!name) return { ok: false, error: 'Name is required' };
    if (name !== before.name) {
      set.name = name;
      changes.name = { from: before.name, to: name };
    }
  }
  if (patch.role !== undefined && patch.role !== before.role) {
    set.role = patch.role;
    changes.role = { from: before.role, to: patch.role };
  }
  if (patch.status !== undefined && patch.status !== before.status) {
    set.status = patch.status;
    changes.status = { from: before.status, to: patch.status };
    // Reactivated by an admin: clear any pause reason and give automation a fresh start.
    if (patch.status === 'active') Object.assign(set, { reactivatedAt: new Date(), suspendedReason: '', suspendedAt: null, suspendedBy: '' });
    else Object.assign(set, { suspendedAt: new Date(), suspendedBy: 'admin' });
  }
  if (patch.avatar !== undefined && patch.avatar.trim() !== (before.avatar ?? '')) {
    const avErr = checkAvatar(patch.avatar);
    if (avErr) return { ok: false, error: avErr };
    set.avatar = patch.avatar.trim();
    changes.avatar = true;
  }
  if (patch.password) {
    const pwErr = validatePassword(patch.password, { email: before.email });
    if (pwErr) return { ok: false, error: pwErr };
    set.passwordHash = await bcrypt.hash(patch.password, BCRYPT_COST);
    set.passwordChangedAt = new Date();
    inc.sessionVersion = 1; // signs the user out on every device
    changes.password = true;
  }

  if (patch.memberId !== undefined) {
    const memberId = normalizeMemberId(patch.memberId);
    const current = before.memberId ?? '';
    if (memberId !== current) {
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
      changes.memberId = { from: current, to: memberId };
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  if (Object.keys(inc).length) update.$inc = inc;
  if (!Object.keys(update).length) return { ok: true, changes };

  try {
    const res = await User.updateOne({ _id: id, orgId }, update);
    if (res.matchedCount === 0) return { ok: false, error: 'User not found' };
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 11000) return { ok: false, error: 'Member ID is already in use' };
    throw e;
  }

  if (changes.role) {
    await syncProgramRoleField(orgId, [id]);
    if (changes.role.from === 'admin') {
      await User.updateOne({ _id: id, orgId }, { $set: { royal: false } });
      await invalidateOrgRoyal(orgId);
    }
  }
  if (changes.status && before.role === 'admin') await invalidateOrgRoyal(orgId);
  if (changes.role || changes.status || changes.password || changes.name) {
    await invalidateAuthState([id]);
  }
  return { ok: true, changes };
}

/**
 * Set the programs a user belongs to.
 * Keeps BOTH sides in sync: User.programIds and Program.mentors / Program.students.
 */
export async function setUserPrograms(
  orgId: string,
  id: string,
  programIds: string[]
): Promise<(Ok & { added: string[]; removed: string[] }) | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();
  const user = (await User.findOne({ _id: id, orgId }).select('role programIds').lean()) as
    | { role: Role; programIds?: unknown[] }
    | null;
  if (!user) return { ok: false, error: 'User not found' };

  // Only keep programs that really belong to this org
  const valid = await Program.find({ orgId, _id: { $in: programIds.filter(isId) } }).select('_id').lean();
  const ids = valid.map((p) => String(p._id));
  const prev = (user.programIds ?? []).map(String);

  await User.updateOne({ _id: id, orgId }, { $set: { programIds: ids } });

  const field = user.role === 'mentor' ? 'mentors' : 'students';
  const other = field === 'mentors' ? 'students' : 'mentors';
  await Program.updateMany(
    { orgId, _id: { $nin: ids } },
    { $pull: { mentors: id, students: id } }
  );
  if (ids.length) {
    await Program.updateMany(
      { orgId, _id: { $in: ids } },
      { $addToSet: { [field]: id }, $pull: { [other]: id } }
    );
  }
  return {
    ok: true,
    added: ids.filter((x) => !prev.includes(x)),
    removed: prev.filter((x) => !ids.includes(x)),
  };
}

/** Change status / role for many users at once (never the acting admin). */
export async function bulkUpdateUsers(
  orgId: string,
  ids: string[],
  actingUserId: string,
  patch: { status?: 'active' | 'disabled'; role?: Role }
): Promise<{ ok: true; updated: number; skippedSelf: boolean; targetIds: string[] } | Err> {
  await db();
  const target = Array.from(new Set(ids.filter(isId))).filter((x) => x !== actingUserId);
  const skippedSelf = ids.includes(actingUserId);
  const set: Record<string, unknown> = {};
  if (patch.status) set.status = patch.status;
  if (patch.status === 'active') Object.assign(set, { reactivatedAt: new Date(), suspendedReason: '', suspendedAt: null, suspendedBy: '' });
  if (patch.status === 'disabled') Object.assign(set, { suspendedAt: new Date(), suspendedBy: 'admin' });
  if (patch.role) set.role = patch.role;
  if (patch.role && patch.role !== 'admin') set.royal = false;
  if (!Object.keys(set).length || target.length === 0) {
    return { ok: true, updated: 0, skippedSelf, targetIds: [] };
  }
  // People approved from "awaiting approval" get a welcome notice.
  const approved =
    patch.status === 'active'
      ? ((await User.find({ orgId, _id: { $in: target }, status: 'pending' }).select('_id').lean()) as { _id: unknown }[]).map((u) => String(u._id))
      : [];
  const res = await User.updateMany({ orgId, _id: { $in: target } }, { $set: set });
  if (approved.length) {
    try {
      const { notifyMany } = await import('./notifications');
      await notifyMany({ orgId, userIds: approved, type: 'account.reactivated', title: 'Your account was approved', body: 'Welcome! You can sign in now.', link: '/dashboard', email: true });
    } catch (e) {
      console.warn('[users] approval notice failed', e);
    }
  }
  if (patch.role) await syncProgramRoleField(orgId, target);
  await invalidateAuthState(target);
  await invalidateOrgRoyal(orgId);
  return { ok: true, updated: res.modifiedCount, skippedSelf, targetIds: target };
}

/** Sign users out of every device (their next request needs a fresh sign-in). */
export async function revokeSessions(
  orgId: string,
  ids: string[]
): Promise<{ ok: true; updated: number; targetIds: string[] } | Err> {
  await db();
  const target = Array.from(new Set(ids.filter(isId)));
  if (!target.length) return { ok: false, error: 'Select at least one user' };
  const res = await User.updateMany({ orgId, _id: { $in: target } }, { $inc: { sessionVersion: 1 } });
  await invalidateAuthState(target);
  return { ok: true, updated: res.modifiedCount, targetIds: target };
}

// ---------------------------------------------------------------------------
// Member IDs for users who don't have one
// ---------------------------------------------------------------------------

export type AssignScope = { role?: Role; ids?: string[] };

export type AssignPreview = {
  ok: true;
  count: number;
  first: string;
  last: string;
  sample: { name: string; memberId: string }[];
};

function missingFilter(orgId: string, scope: AssignScope) {
  const q: Record<string, unknown> = { orgId: oid(orgId), ...MISSING_MEMBER_ID };
  if (scope.role) q.role = scope.role;
  if (scope.ids) q._id = { $in: scope.ids.filter(isId).map(oid) };
  return q;
}

/** What "Assign member IDs" would do — nothing is saved. */
export async function previewMissingMemberIds(
  orgId: string,
  format: string,
  scope: AssignScope = {}
): Promise<AssignPreview | Err> {
  const fmtErr = validateMemberIdFormat(format);
  if (fmtErr) return { ok: false, error: fmtErr };
  await db();
  const users = (await User.find(missingFilter(orgId, scope))
    .sort({ createdAt: 1, _id: 1 })
    .select('name')
    .limit(5000)
    .lean()) as { name: string }[];
  if (!users.length) return { ok: true, count: 0, first: '', last: '', sample: [] };
  const ids = generateMemberIds(format, users.length, await existingIdsForFormat(orgId, format));
  return {
    ok: true,
    count: users.length,
    first: ids[0],
    last: ids[ids.length - 1],
    sample: users.slice(0, 3).map((u, i) => ({ name: u.name, memberId: ids[i] })),
  };
}

/**
 * Give every matching user without a member ID the next ID in `format`,
 * oldest account first. Never overwrites an existing ID, and retries with
 * fresh numbers if someone else took one at the same moment.
 */
export async function assignMissingMemberIds(
  orgId: string,
  format: string,
  scope: AssignScope = {}
): Promise<
  | { ok: true; assigned: number; failed: number; first: string; last: string; assignedIds: string[] }
  | Err
> {
  const fmtErr = validateMemberIdFormat(format);
  if (fmtErr) return { ok: false, error: fmtErr };
  await db();

  let pending = (await User.find(missingFilter(orgId, scope))
    .sort({ createdAt: 1, _id: 1 })
    .select('_id')
    .limit(5000)
    .lean()) as { _id: Types.ObjectId }[];

  const assignedUserIds: string[] = [];
  const given: string[] = [];

  for (let attempt = 0; attempt < 4 && pending.length; attempt++) {
    const ids = generateMemberIds(format, pending.length, await existingIdsForFormat(orgId, format));
    const ops = pending.map((u, i) => ({
      updateOne: {
        filter: { _id: u._id, orgId: oid(orgId), ...MISSING_MEMBER_ID },
        update: { $set: { memberId: ids[i] } },
      },
    }));

    let failedIdx = new Set<number>();
    try {
      await User.bulkWrite(ops, { ordered: false });
    } catch (e) {
      const err = e as { writeErrors?: { index?: number; err?: { index?: number } }[] };
      if (!Array.isArray(err.writeErrors)) throw e;
      failedIdx = new Set(err.writeErrors.map((w) => (w.index ?? w.err?.index) as number));
    }

    // Confirm which ones really got their ID (also covers concurrent edits).
    const okIds = pending.filter((_, i) => !failedIdx.has(i));
    const check = (await User.find({ _id: { $in: okIds.map((u) => u._id) } })
      .select('memberId')
      .lean()) as { _id: Types.ObjectId; memberId?: string }[];
    const got = new Map(check.map((c) => [String(c._id), c.memberId ?? '']));
    pending.forEach((u, i) => {
      if (!failedIdx.has(i) && got.get(String(u._id)) === ids[i]) {
        assignedUserIds.push(String(u._id));
        given.push(ids[i]);
      }
    });
    pending = pending.filter((_, i) => failedIdx.has(i));
  }

  given.sort();
  return {
    ok: true,
    assigned: assignedUserIds.length,
    failed: pending.length,
    first: given[0] ?? '',
    last: given[given.length - 1] ?? '',
    assignedIds: assignedUserIds,
  };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export type DeleteUsersResult =
  | {
      ok: true;
      deleted: number;
      blocked: { id: string; name: string; reason: string }[];
      deletedUsers: { id: string; name: string; email: string; role: Role }[];
    }
  | Err;

/**
 * Permanently delete users and clean up what belongs to them — all inside one
 * transaction, so a failure part-way leaves nothing half-deleted:
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
  const unique = Array.from(new Set(ids.filter(isId)));
  const users = (await User.find({ orgId, _id: { $in: unique } })
    .select('_id name email role')
    .lean()) as { _id: Types.ObjectId; name: string; email: string; role: Role }[];

  const blocked: { id: string; name: string; reason: string }[] = [];
  const sessionCounts = (await Session.aggregate([
    { $match: { orgId: oid(orgId), mentorId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$mentorId', n: { $sum: 1 } } },
  ])) as { _id: unknown; n: number }[];
  const sessionsByMentor = new Map<string, number>(
    sessionCounts.map((s) => [String(s._id), Number(s.n) || 0])
  );

  const deletable: typeof users = [];
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
    deletable.push(u);
  }

  if (deletable.length === 0) return { ok: true, deleted: 0, blocked, deletedUsers: [] };
  const delIds = deletable.map((u) => u._id);

  const deleted = await withTransaction(async (session) => {
    const o = session ? { session } : {};
    await Program.updateMany(
      { orgId },
      { $pull: { mentors: { $in: delIds }, students: { $in: delIds } } },
      o
    );
    await Submission.deleteMany({ orgId, studentId: { $in: delIds } }, o);
    await Attendance.deleteMany({ orgId, studentId: { $in: delIds } }, o);

    const ownQueries = await Query.find({ orgId, studentId: { $in: delIds } }, null, o)
      .select('_id')
      .lean();
    const queryIds = ownQueries.map((q) => q._id);
    if (queryIds.length) {
      await QueryMessage.deleteMany({ orgId, queryId: { $in: queryIds } }, o);
      await Query.deleteMany({ orgId, _id: { $in: queryIds } }, o);
    }
    await Query.updateMany(
      { orgId, assignedMentorId: { $in: delIds } },
      { $set: { assignedMentorId: null } },
      o
    );
    await Notification.deleteMany({ orgId, userId: { $in: delIds } }, o);

    const res = await User.deleteMany({ orgId, _id: { $in: delIds } }, o);
    return res.deletedCount ?? delIds.length;
  });

  await invalidateAuthState(deletable.map((u) => String(u._id)));

  return {
    ok: true,
    deleted,
    blocked,
    deletedUsers: deletable.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })),
  };
}


// ---------------------------------------------------------------------------
// Royal admin helpers
// ---------------------------------------------------------------------------

/** role / royal / email for a set of users (permission checks in actions). */
export async function getRoleInfo(
  orgId: string,
  ids: string[]
): Promise<Map<string, { role: Role; royal: boolean; email: string; name: string; status: string }>> {
  const valid = Array.from(new Set(ids.filter(isId)));
  if (!valid.length) return new Map();
  await db();
  const rows = (await User.find({ orgId, _id: { $in: valid } })
    .select('role royal email name status')
    .lean()) as { _id: unknown; role: Role; royal?: boolean; email: string; name: string; status: string }[];
  return new Map(
    rows.map((r) => [
      String(r._id),
      { role: r.role, royal: r.role === 'admin' && (r.royal === true || isEnvRoyal(r.email)), email: r.email, name: r.name, status: r.status },
    ])
  );
}

export async function listAdmins(orgId: string): Promise<UserListItem[]> {
  await db();
  const rows = await User.find({ orgId, role: 'admin' }).sort({ createdAt: 1 }).lean();
  return rows.map(toItem);
}

/** Grant or remove royal status (caller must already be a royal admin). */
export async function setRoyal(
  orgId: string,
  id: string,
  royal: boolean
): Promise<Ok | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();
  const u = (await User.findOne({ _id: id, orgId }).select('role status email').lean()) as
    | { role: Role; status: string; email: string }
    | null;
  if (!u) return { ok: false, error: 'User not found' };
  if (royal && (u.role !== 'admin' || u.status !== 'active')) {
    return { ok: false, error: 'Only active admins can be made royal admins' };
  }
  if (!royal && isEnvRoyal(u.email)) {
    return { ok: false, error: 'This admin is royal through ROYAL_ADMIN_EMAILS — remove them there.' };
  }
  await User.updateOne({ _id: id, orgId }, { $set: { royal } });
  await invalidateOrgRoyal(orgId);
  const admins = (await User.find({ orgId, role: 'admin' }).select('_id').lean()).map((a) => String(a._id));
  await invalidateAuthState(admins);
  return { ok: true };
}

/** Grant or remove Super Admin (caller must be a Super Admin, or claiming during bootstrap). */
export async function setSuperAdmin(orgId: string, id: string, value: boolean): Promise<Ok | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();
  const u = (await User.findOne({ _id: id, orgId }).select('role status email').lean()) as { role: Role; status: string; email: string } | null;
  if (!u) return { ok: false, error: 'User not found' };
  if (value && (u.role !== 'admin' || u.status !== 'active')) return { ok: false, error: 'Only active admins can be made Super Admin' };
  if (!value && isEnvSuper(u.email)) return { ok: false, error: 'This admin is Super Admin through SUPER_ADMIN_EMAILS — remove them there.' };
  if (!value) {
    // Never remove the last Super Admin (that would silently re-open bootstrap mode).
    const others = await User.countDocuments({ orgId, role: 'admin', status: 'active', superAdmin: true, _id: { $ne: id } });
    if (others === 0 && !envSuperEmails().length) return { ok: false, error: 'This is the only Super Admin. Make someone else Super Admin first.' };
  }
  // Super admins are always royal too.
  await User.updateOne({ _id: id, orgId }, { $set: value ? { superAdmin: true, royal: true } : { superAdmin: false } });
  await invalidateOrgSuper(orgId);
  await invalidateOrgRoyal(orgId);
  const admins = (await User.find({ orgId, role: 'admin' }).select('_id').lean()).map((a) => String(a._id));
  await invalidateAuthState(admins);
  return { ok: true };
}

/** Bump sessionVersion for everyone in the org except `keepId`. */
export async function revokeAllSessions(orgId: string, keepId: string): Promise<number> {
  await db();
  const res = await User.updateMany({ orgId, _id: { $ne: keepId } }, { $inc: { sessionVersion: 1 } });
  const ids = (await User.find({ orgId, _id: { $ne: keepId } }).select('_id').limit(5000).lean()).map((u) => String(u._id));
  await invalidateAuthState(ids);
  return res.modifiedCount;
}

/** Save the user's personal theme preset ('' = organisation theme). */
export async function setThemePreset(orgId: string, id: string, presetId: string): Promise<Ok | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();
  await User.updateOne({ _id: id, orgId }, { $set: { themePreset: presetId.slice(0, 60) } });
  await invalidateAuthState([id]);
  return { ok: true };
}

/** Personal design style. '' = follow the organisation style. */
export async function setUiStyle(orgId: string, id: string, styleId: string): Promise<Ok | Err> {
  if (!isId(id)) return { ok: false, error: 'User not found' };
  await db();
  await User.updateOne({ _id: id, orgId }, { $set: { uiStyle: styleId.slice(0, 60) } });
  await invalidateAuthState([id]);
  return { ok: true };
}
