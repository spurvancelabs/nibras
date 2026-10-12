import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
      <div className="card max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">LMS</h1>
        <p className="text-sm text-muted">
          Setup complete. Auth coming next.
        </p>
        <Link href="/login" className="btn-primary w-full">
          Go to Login
        </Link>
      </div>
    </main>
  );
}