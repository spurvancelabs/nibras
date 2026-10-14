import { NextResponse } from 'next/server';
import type { Role } from '@/lib/constants';

type AuthorizedParams = {
  auth: { user?: { id: string; role: Role; orgId: string } } | null;
  request: { nextUrl: URL };
};

type JwtParams = {
  token: Record<string, unknown>;
  user?: { id?: string; role?: Role; orgId?: string };
};

type SessionParams = {
  session: {
    user?: {
      id: string;
      role: Role;
      orgId: string;
      name?: string | null;
      email?: string | null;
    };
  } & Record<string, unknown>;
  token: Record<string, unknown>;
};

export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [],

  callbacks: {
    authorized({ auth, request }: AuthorizedParams) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isAuthPage = path.startsWith('/login');
      const isPublic = path === '/';

      if (isAuthPage) {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }
      if (isPublic) return true;
      return isLoggedIn;
    },

    jwt({ token, user }: JwtParams) {
      if (user) {
        token.id = user.id ?? '';
        token.role = user.role ?? 'student';
        token.orgId = user.orgId ?? '';
      }
      return token;
    },

    session({ session, token }: SessionParams) {
      if (session.user) {
        session.user.id = String(token.id ?? '');
        session.user.role = (token.role as Role) ?? 'student';
        session.user.orgId = String(token.orgId ?? '');
      }
      return session;
    },
  },
};