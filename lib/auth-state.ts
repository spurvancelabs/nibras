// =============================================================================
// FILE: lib/auth-state.ts   (NEW FILE)
// Live account state for signed-in users (role, status, session version).
// Cached for 30 s per user, and the cache is cleared immediately when an admin
// disables someone, changes a role, resets a password or signs them out.
// That means changes apply within seconds without a DB hit on every page.
// =============================================================================

import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import User from '@/models/User';
import type { Role } from '@/lib/constants';
import { computeRoyal } from './royal';
import { computeSuper } from './super';

export type AuthState = {
  role: Role;
  status: 'active' | 'disabled';
  sessionVersion: number;
  orgId: string;
  name: string;
  email: string;
  /** Effective royal-admin status (see lib/royal.ts). */
  royal: boolean;
  /** Personal theme preset id ('' = organisation theme). */
  themePreset: string;
  /** Personal design style id ('' = organisation style). */
  uiStyle: string;
  /** Two-step sign-in is switched on for this account. */
  twoFactorEnabled: boolean;
  /** Profile photo URL ('' = initials). */
  avatar: string;
  /** Effective Super Admin status (see lib/super.ts). */
  superAdmin: boolean;
  /** Premium membership end (ISO) or null. */
  premiumUntil: string | null;
};

const tag = (userId: string) => `auth-state:${userId}`;

async function load(userId: string): Promise<AuthState | null> {
  await db();
  const u = (await User.findById(userId).select('role status sessionVersion orgId name email royal themePreset uiStyle twoFactorEnabled avatar superAdmin premiumUntil').lean()) as
    | {
        role: Role;
        status: 'active' | 'disabled';
        sessionVersion?: number;
        orgId: unknown;
        name: string;
        email: string;
        royal?: boolean;
        themePreset?: string;
        uiStyle?: string;
        twoFactorEnabled?: boolean;
        avatar?: string;
        superAdmin?: boolean;
        premiumUntil?: Date | null;
      }
    | null;
  if (!u) return null;
  const royal = await computeRoyal({
    orgId: String(u.orgId),
    role: u.role,
    status: u.status,
    email: u.email,
    royal: u.royal,
    superAdmin: u.superAdmin,
  });
  const superAdmin = await computeSuper({
    orgId: String(u.orgId),
    role: u.role,
    status: u.status,
    email: u.email,
    superAdmin: u.superAdmin,
    royal,
  });
  return {
    royal,
    themePreset: u.themePreset ?? '',
    uiStyle: u.uiStyle ?? '',
    twoFactorEnabled: u.twoFactorEnabled === true,
    avatar: u.avatar ?? '',
    superAdmin,
    premiumUntil: u.premiumUntil ? new Date(u.premiumUntil).toISOString() : null,
    role: u.role,
    status: u.status === 'disabled' ? 'disabled' : 'active',
    sessionVersion: Number(u.sessionVersion ?? 0) || 0,
    orgId: String(u.orgId),
    name: u.name ?? '',
    email: u.email ?? '',
  };
}

export function getAuthState(userId: string): Promise<AuthState | null> {
  return unstable_cache(() => load(userId), ['auth-state', userId], {
    revalidate: 30,
    tags: [tag(userId)],
  })();
}

/** Call after changing role / status / password / sessionVersion. Never throws. */
export async function invalidateAuthState(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  try {
    const mod = await import('next/cache');
    for (const id of userIds) {
      try {
        mod.updateTag(tag(id)); // immediate, inside Server Actions
      } catch {
        try {
          mod.revalidateTag(tag(id), { expire: 0 });
        } catch (e) {
          console.warn('[auth-state] could not invalidate', id, e);
        }
      }
    }
  } catch (e) {
    console.warn('[auth-state] invalidate failed (cache expires within 30s):', e);
  }
}
