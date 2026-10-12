import { requireAuth } from '@/lib/auth-helpers';
import { getUserById } from '@/lib/users';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const me = await requireAuth();
  const user = await getUserById(me.orgId, me.id);
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-muted">
          Update your name, avatar, and password.
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}