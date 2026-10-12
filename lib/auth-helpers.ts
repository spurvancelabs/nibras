import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import type { Role } from '@/models/User';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  orgId: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
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