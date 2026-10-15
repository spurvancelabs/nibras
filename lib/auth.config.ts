import { NextResponse } from 'next/server';

export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [],

  callbacks: {
    authorized({ auth, request }: { auth: any; request: any }) {
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

    jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },

    session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
};