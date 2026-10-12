import NextAuth from '@/lib/auth';

export const runtime = 'nodejs'; // bcrypt + mongoose need Node

const handler = NextAuth;

export { handler as GET, handler as POST };