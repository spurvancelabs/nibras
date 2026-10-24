import { requireAuth } from '@/lib/auth-helpers';
import { getUserById } from '@/lib/users';
import ProfileForm from './ProfileForm';
import PersonalTheme from './PersonalTheme';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const me = await requireAuth();
  const [user, settings] = await Promise.all([getUserById(me.orgId, me.id), getSettings()]);
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-muted">
          Update your name, avatar, password and theme.
        </p>
      </div>

      <div className="max-w-2xl">
        <ProfileForm user={user} />
      </div>

      {settings.allowUserThemes && <PersonalTheme current={me.themePreset ?? ''} />}
    </div>
  );
}