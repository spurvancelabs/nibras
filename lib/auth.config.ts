import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],

  callbacks: {
    authorized({ auth, request }) {
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

    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: 'admin' | 'mentor' | 'student' }).role;
        token.orgId = (user as { orgId: string }).orgId;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;