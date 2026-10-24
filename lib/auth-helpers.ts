// =============================================================================
// FILE: lib/auth-helpers.ts
// Current-user helpers used by pages and server actions.
// NEW: royal flag on the session user, requireRoyal(), and failed role checks
// are written to the audit log as "Access denied" (security monitoring).
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from './auth';
import type { Role } from '@/lib/constants';

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
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = (await auth()) as { user?: SessionUser } | null;
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
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
