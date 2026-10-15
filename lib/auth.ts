import NextAuth from 'next-auth';
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw: any) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

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
        } as any;
      },
    }),
  ],
});