// =============================================================================
// FILE: lib/super.ts   (NEW FILE — server only)
// "Super Admin" = the highest level (above Royal Admin). Controls global
// policies: premium policy, inactivity automation, AI grading configuration,
// data retention and permission delegation.
//
// Who is Super Admin (always also a royal admin):
//   1. admins with `superAdmin: true` in the database
//   2. admins whose email is in SUPER_ADMIN_EMAILS (comma-separated)
//   3. BOOTSTRAP: while an organisation has NO super admin at all, every
//      ROYAL admin is treated as super, so nobody is locked out of the new
//      features. Once the first super admin exists, the others lose these
//      powers. (Same pattern as royal admins.)
// =============================================================================

import 'server-only';
import { unstable_cache } from 'next/cache';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';

export function envSuperEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvSuper(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return !!e && envSuperEmails().includes(e);
}

const orgTag = (orgId: string) => `super-org:${orgId}`;

async function loadOrgHasSuper(orgId: string): Promise<boolean> {
  await db();
  const env = envSuperEmails();
  const or: Record<string, unknown>[] = [{ superAdmin: true }];
  if (env.length) or.push({ email: { $in: env } });
  const found = await User.exists({ orgId: new Types.ObjectId(orgId), role: 'admin', status: 'active', $or: or });
  return !!found;
}

export function orgHasSuper(orgId: string): Promise<boolean> {
  return unstable_cache(() => loadOrgHasSuper(orgId), ['super-org', orgId], { revalidate: 60, tags: [orgTag(orgId)] })();
}

export async function invalidateOrgSuper(orgId: string): Promise<void> {
  try {
    const mod = await import('next/cache');
    try {
      mod.updateTag(orgTag(orgId));
    } catch {
      mod.revalidateTag(orgTag(orgId), { expire: 0 });
    }
  } catch (e) {
    console.warn('[super] cache invalidate failed', e);
  }
}

/** Effective Super Admin status. `royal` must already be the effective royal status. */
export async function computeSuper(u: {
  orgId: string;
  role: string;
  status?: string;
  email?: string | null;
  superAdmin?: boolean | null;
  royal: boolean;
}): Promise<boolean> {
  if (u.role !== 'admin' || u.status === 'disabled' || !u.royal) return false;
  if (u.superAdmin === true || isEnvSuper(u.email)) return true;
  try {
    return !(await orgHasSuper(u.orgId)); // bootstrap mode
  } catch {
    return false;
  }
}
