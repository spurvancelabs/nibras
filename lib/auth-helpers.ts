// =============================================================================
// FILE: lib/auth-helpers.ts
// Current-user helpers used by pages and server actions.
// NEW: royal flag on the session user, requireRoyal(), and failed role checks
// are written to the audit log as "Access denied" (security monitoring).
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from './auth';
import type { Role } from '@/lib/constants';
import { can, type Permission, type PermissionOverrides } from './rbac';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  orgId: string;
  /** Effective royal-admin status (only meaningful for admins). */
  royal?: boolean;
  /** Personal theme preset id ('' = organisation theme). */
  themePreset?: string;
  /** Personal design style id ('' = organisation style). */
  uiStyle?: string;
  /** Two-step sign-in is on for this account. */
  twoFactorEnabled?: boolean;
  /** Profile photo URL. */
  avatar?: string;
  /** Effective Super Admin status. */
  superAdmin?: boolean;
  /** Premium membership end (ISO) or null. */
  premiumUntil?: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = (await auth()) as { user?: SessionUser } | null;
  if (!session?.user) return null;
  return session.user;
}

/**
 * Signed-in user, or redirect to /login.
 * When Settings → Security REQUIRES two-step sign-in for this user's role and
 * they haven't set it up yet, they are sent to Profile → Security first.
 * The profile page / its actions pass { allowWithout2fa: true }.
 */
export async function requireAuth(opts: { allowWithout2fa?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!opts.allowWithout2fa && !user.twoFactorEnabled && (await mustSetUp2fa(user))) {
    redirect('/profile?tab=security&required=1');
  }
  return user;
}

/** True when the org policy requires 2FA for this user and it is off. Fail-open. */
export async function mustSetUp2fa(user: SessionUser): Promise<boolean> {
  if (user.twoFactorEnabled) return false;
  try {
    const [{ getSettings }, { policyRequires }] = await Promise.all([import('./settings'), import('./two-factor')]);
    const s = await getSettings();
    return policyRequires(s.twoFactorPolicy, user.role);
  } catch (e) {
    console.error('[requireAuth] 2FA policy check failed (allowing):', e);
    return false;
  }
}

async function logDenied(user: SessionUser, needed: string) {
  try {
    const { audit } = await import('./audit');
    await audit({
      orgId: user.orgId,
      action: 'security.access_denied',
      actorId: user.id,
      actorEmail: user.email ?? '',
      actorName: user.name ?? '',
      summary: `${user.role} tried to open a ${needed}-only page or action`,
      meta: { needed, role: user.role },
    });
  } catch {
    /* never block on logging */
  }
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    await logDenied(user, roles.join('/'));
    redirect('/dashboard');
  }
  return user;
}

/** True when this user is an effective royal admin (checked in the database). */
export async function isRoyal(user: SessionUser): Promise<boolean> {
  if (user.role !== 'admin') return false;
  try {
    const [{ db }, { default: User }, { computeRoyal }] = await Promise.all([
      import('./db'),
      import('@/models/User'),
      import('./royal'),
    ]);
    await db();
    const u = (await User.findOne({ _id: user.id, orgId: user.orgId })
      .select('role status email royal')
      .lean()) as { role: string; status: string; email: string; royal?: boolean } | null;
    if (!u) return false;
    return computeRoyal({ orgId: user.orgId, role: u.role, status: u.status, email: u.email, royal: u.royal });
  } catch (e) {
    console.error('[isRoyal] check failed', e);
    return false;
  }
}

/** Royal admins only (pages redirect, actions should check `isRoyal`). */
export async function requireRoyal(): Promise<SessionUser & { royal: true }> {
  const user = await requireRole('admin');
  if (!(await isRoyal(user))) {
    await logDenied(user, 'royal admin');
    redirect('/admin/users?denied=royal');
  }
  return { ...user, royal: true };
}

// ---------------------------------------------------------------------------
// Permissions (lib/rbac.ts) — the server is always the authority.
// ---------------------------------------------------------------------------


async function permissionOverrides(): Promise<PermissionOverrides | null> {
  try {
    const { getSettings } = await import('./settings');
    return ((await getSettings()).permissionOverrides as PermissionOverrides) ?? null;
  } catch {
    return null;
  }
}

/** For server actions: does this user have the permission? (live role data) */
export async function hasPermission(user: SessionUser, perm: Permission): Promise<boolean> {
  return can(user, perm, await permissionOverrides());
}

/** For pages: signed-in user with the permission, otherwise redirect. */
export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!(await hasPermission(user, perm))) {
    await logDenied(user, perm);
    redirect('/dashboard?denied=1');
  }
  return user;
}
