import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const session = (await auth()) as { user?: unknown } | null;
  if (session?.user) {
    redirect('/dashboard');
  }
  return <LoginForm />;
}