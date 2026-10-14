import NextAuth, { DefaultSession } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import User from '@/models/User';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Extend the session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: 'admin' | 'mentor' | 'student';
      orgId: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: 'admin' | 'mentor' | 'student';
    orgId: string;
  }
}

export const authOptions = {
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          await db();

          const user = await User.findOne({
            email: parsed.data.email.toLowerCase().trim(),
          })
            .select('+passwordHash')
            .lean();

          if (!user) return null;
          if (user.status !== 'active') return null;

          const ok = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash as string
          );
          if (!ok) return null;

          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            orgId: String(user.orgId),
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: { token: any; user?: any }) {
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

export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);