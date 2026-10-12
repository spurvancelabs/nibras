import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-helpers';
import { getUserById } from '@/lib/users';
import { listPrograms } from '@/lib/programs';
import EditUserForm from './EditUserForm';

export const dynamic = 'force-dynamic';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole('admin');
  const { id } = await params;

  const [user, programs] = await Promise.all([
    getUserById(admin.orgId, id),
    listPrograms(admin.orgId),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Edit user</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <EditUserForm user={user} programs={programs} />
    </div>
  );
}