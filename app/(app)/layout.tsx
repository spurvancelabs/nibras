import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import LogoutButton from '@/components/LogoutButton';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            LMS
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span className="text-muted">|</span>
            <span className="text-muted">
              {user.name} · {user.role}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}