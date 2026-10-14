import Link from 'next/link';
import { requireRole } from '@/lib/auth-helpers';
import ImportForm from './ImportForm';

export const dynamic = 'force-dynamic';

export default async function ImportUsersPage() {
  await requireRole('admin');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-muted hover:underline"
        >
          ← Back to users
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Import users</h1>
        <p className="text-sm text-muted">
          Upload or paste a CSV to create users in bulk. Up to 500 rows.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}