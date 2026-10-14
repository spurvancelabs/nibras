import { redirect } from 'next/navigation';
import { auth } from './auth';
import type { Role } from '@/lib/constants';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  orgId: string;
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

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect('/dashboard');
  return user;
}