import 'server-only';
import { db } from './db';
import User, { type Role } from '@/models/User';
import bcrypt from 'bcryptjs';

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  avatar: string;
  programIds: string[];
  createdAt: string;
};

export async function listUsers(
  orgId: string,
  filters?: { role?: Role; search?: string }
): Promise<UserListItem[]> {
  await db();

  const query: Record<string, unknown> = { orgId };
  if (filters?.role) query.role = filters.role;
  if (filters?.search) {
    const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { email: re }];
  }

  const rows = await User.find(query).sort({ createdAt: -1 }).limit(500).lean();

  return rows.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Role,
    status: u.status as 'active' | 'disabled',
    avatar: u.avatar ?? '',
    programIds: (u.programIds ?? []).map(String),
    createdAt: new Date(u.createdAt).toISOString(),
  }));
}

export async function getUserById(
  orgId: string,
  id: string
): Promise<UserListItem | null> {
  await db();
  const u = await User.findOne({ _id: id, orgId }).lean();
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Role,
    status: u.status as 'active' | 'disabled',
    avatar: u.avatar ?? '',
    programIds: (u.programIds ?? []).map(String),
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

export async function createUser(input: {
  orgId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await db();

  const email = input.email.toLowerCase().trim();
  const exists = await User.findOne({ orgId: input.orgId, email });
  if (exists) return { ok: false, error: 'Email already exists in this organization' };

  const passwordHash = await bcrypt.hash(input.password, 10);

  const doc = await User.create({
    orgId: input.orgId,
    name: input.name.trim(),
    email,
    passwordHash,
    role: input.role,
    avatar: input.avatar ?? '',
    status: 'active',
    programIds: [],
  });

  return { ok: true, id: String(doc._id) };
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
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();

  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name.trim();
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.avatar !== undefined) set.avatar = patch.avatar;
  if (patch.password) set.passwordHash = await bcrypt.hash(patch.password, 10);

  const res = await User.updateOne({ _id: id, orgId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, error: 'User not found' };
  return { ok: true };
}

export async function setUserPrograms(
  orgId: string,
  id: string,
  programIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db();
  const res = await User.updateOne(
    { _id: id, orgId },
    { $set: { programIds } }
  );
  if (res.matchedCount === 0) return { ok: false, error: 'User not found' };
  return { ok: true };
}