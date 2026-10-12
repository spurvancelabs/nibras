import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center space-y-4">
        <p className="text-6xl font-bold text-muted">404</p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link href="/dashboard" className="btn-primary w-full">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}