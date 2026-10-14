import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LoginForm from './LoginForm.tsx';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }
  return <LoginForm />;
}