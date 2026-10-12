import { requireRole } from '@/lib/auth-helpers';
import NewUserForm from './NewUserForm';

export default async function NewUserPage() {
  await requireRole('admin');
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">New user</h1>
        <p className="text-sm text-muted">Create an account for a mentor, student, or admin.</p>
      </div>
      <NewUserForm />
    </div>
  );
}