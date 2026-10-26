// =============================================================================
// FILE: lib/royal.ts   (NEW FILE)
// "Royal admin" = an admin with extra powers:
//   - create / edit / disable / delete other ADMINS and grant the admin role
//   - see the audit log and the Security dashboard
//   - grant or remove royal status, emergency sign-out of everyone
//
// Who is royal:
//   1. admins with `royal: true` in the database (granted from Security page)
//   2. admins whose email is listed in ROYAL_ADMIN_EMAILS (comma-separated)
//   3. BOOTSTRAP: while an organisation has NO royal admin at all, every admin
//      is treated as royal — exactly how things worked before — so deploying
//      this never locks anyone out. Once the first royal admin exists, the
//      other admins lose the royal-only powers.
// =============================================================================

import 'server-only';
import { unstable_cache } from 'next/cache';
import { Types } from 'mongoose';
import { db } from './db';
import User from '@/models/User';

export function envRoyalEmails(): string[] {
  return (process.env.ROYAL_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Super admins are always royal too (read here to avoid a circular import).
function envSuperEmailsLocal(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvRoyal(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return !!e && (envRoyalEmails().includes(e) || envSuperEmailsLocal().includes(e));
}

const orgTag = (orgId: string) => `royal-org:${orgId}`;

async function loadOrgHasRoyal(orgId: string): Promise<boolean> {
  await db();
  const env = [...envRoyalEmails(), ...envSuperEmailsLocal()];
  const or: Record<string, unknown>[] = [{ royal: true }, { superAdmin: true }];
  if (env.length) or.push({ email: { $in: env } });
  const found = await User.exists({
    orgId: new Types.ObjectId(orgId),
    role: 'admin',
    status: 'active',
    $or: or,
  });
  return !!found;
}

/** True once at least one active royal admin exists in the organisation. */
export function orgHasRoyal(orgId: string): Promise<boolean> {
  return unstable_cache(() => loadOrgHasRoyal(orgId), ['royal-org', orgId], {
    revalidate: 60,
    tags: [orgTag(orgId)],
  })();
}

export async function invalidateOrgRoyal(orgId: string): Promise<void> {
  try {
    const mod = await import('next/cache');
    try {
      mod.updateTag(orgTag(orgId));
    } catch {
      mod.revalidateTag(orgTag(orgId), { expire: 0 });
    }
  } catch (e) {
    console.warn('[royal] cache invalidate failed', e);
  }
}

/** Effective royal status for a user record. */
export async function computeRoyal(u: {
  orgId: string;
  role: string;
  status?: string;
  email?: string | null;
  royal?: boolean | null;
  superAdmin?: boolean | null;
}): Promise<boolean> {
  if (u.role !== 'admin' || u.status === 'disabled') return false;
  if (u.royal === true || u.superAdmin === true || isEnvRoyal(u.email)) return true;
  try {
    return !(await orgHasRoyal(u.orgId)); // bootstrap mode
  } catch {
    return false;
  }
}
