import { requireRole } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global settings</h1>
        <p className="text-sm text-muted">
          These settings apply across the entire platform.
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  );
}