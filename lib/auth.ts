import NextAuth, { DefaultSession } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import User from '@/models/User';
import { authConfig } from './auth.config';

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
  ...authConfig,
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
};

export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);