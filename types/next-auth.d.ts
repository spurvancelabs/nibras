import type { DefaultSession } from 'next-auth';
import type { Role } from '@/models/User';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      orgId: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    role: Role;
    orgId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    orgId: string;
  }
}